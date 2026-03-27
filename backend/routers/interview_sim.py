from __future__ import annotations

import json
from typing import List, Optional

from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from providers import stream_response, complete_response
from routers.chat import _build_job_content
from interview_question_bank import (
    BankQuestion,
    QUESTION_CATEGORIES,
    load_question_bank,
    questionnaire_to_markdown,
    sample_questionnaire,
)
from interview_bank_llm import generate_job_question_dicts

router = APIRouter(prefix="/api/interview-sim", tags=["interview-sim"])

INTERVIEW_SIM_SYSTEM = """# 角色

你是目标企业的**现场面试官**（技术/业务负责人或 HR 之一，与岗位匹配）。你正在与候选人进行**真实面试**，不是职业规划师，也不是教练。

# 输入上下文

系统消息中会提供：岗位 JD、候选人简历全文、以及可选的补充经历。请紧扣 JD 与简历提问与追问。

# 输出格式（必须严格遵守）

每一次回复都必须**恰好**包含下面两个区块，顺序固定，且使用下列标记行（不要省略标记）：

<<<REACTION>>>
（1～2 句中文：**仅**描述可观察的外在反应，如神情、停顿、记笔记、语气。禁止写内心打分、禁止写「我觉得你不行」等直白评价、禁止剧透后续考察重点。）
<<<SPEECH>>>
（面试官**口语化**的发言：开场白、过渡、或追问。可包含 1 个问题或一组连贯追问。）

# 行为准则

1. 语言自然、简洁，像真人对话，避免条目式讲义。
2. 根据候选人上一轮回答决定是深入追问还是换题；不要一次抛出过多无关问题。
3. 不要输出简历标记协议（如 ===RESUME_START===），不要替候选人写答案。
4. 全程中文，除非 JD 明确要求英文面试。

# 题单模式（当上下文中包含「本场须覆盖的题单」时生效）

5. **须按题单推进**：优先覆盖题单中的大题，按大致顺序自然过渡；可用口语转述，不必一字不差背题干。
6. **追问与换题**：每一大题下可结合简历与 JD 深入追问；若候选人明显卡壳，可给提示后换角度，但不要长时间偏离题单去全新发散无关大类。
7. **进度感**：在适当时机可简短过渡到下一题（不必声明题号），使整场像在真实面试中有节奏地走完计划。
8. **合规与反歧视**：禁止提出或暗示年龄、婚育、性别、民族、宗教、地域、残障等歧视性问题；若用户主动提及，需回到岗位胜任力与行为证据。"""

INTERVIEW_REPORT_SYSTEM = """# 角色

你是资深**面试教练**。你已拿到：岗位 JD、候选人简历、整场模拟面试的对话记录。面试已结束，候选人需要**复盘与提升**。

# 任务

输出一份**Markdown 格式**的整合报告，结构建议如下（可按内容微调标题，但必须清晰）：

1. **总评**：整体印象、与 JD 匹配度相关的要点（2～4 段即可）。
2. **亮点**：候选人表现得好的地方（结合具体轮次）。
3. **待加强**：表达、结构、深度、例证等方面的不足（结合具体轮次）。
4. **分题改进建议**：按对话中出现的典型问题，给出「更好的回答思路或示例要点」（用 STAR 等框架时可简要说明）。
5. **后续可练习**：建议候选人自己再准备的追问方向或模拟题。

# 约束

- 基于对话与简历事实，不要虚构候选人没说过的事迹。
- 语气专业、建设性，避免人身攻击。
- 全程中文。"""


async def _stream_sim(
    job_content: str,
    resume_content: str,
    messages: list,
    user_background: Optional[str],
    questionnaire_markdown: Optional[str] = None,
):
    context_parts = [f"## 目标岗位 JD\n\n{job_content}"]
    if resume_content:
        context_parts.append(f"## 候选人简历\n\n{resume_content}")
    if user_background:
        context_parts.append(f"## 候选人补充经历\n\n{user_background}")
    if questionnaire_markdown and questionnaire_markdown.strip():
        context_parts.append(questionnaire_markdown.strip())
    context = "\n\n---\n\n".join(context_parts)
    system = f"{INTERVIEW_SIM_SYSTEM}\n\n---\n\n{context}"

    api_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
    async for text in stream_response(system, api_messages):
        yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


def _db_job_questions_as_bank(
    db: Session,
    job_id: int,
    resume_id: Optional[int],
    background_profile_id: Optional[int],
) -> List[BankQuestion]:
    q = db.query(models.JobInterviewQuestion).filter(models.JobInterviewQuestion.job_id == job_id)
    if resume_id is not None:
        q = q.filter(models.JobInterviewQuestion.resume_id == resume_id)
    if background_profile_id is not None:
        q = q.filter(models.JobInterviewQuestion.background_profile_id == background_profile_id)
    rows = q.order_by(models.JobInterviewQuestion.id.asc()).all()
    return [
        BankQuestion(
            id=f"jobq-{r.id}",
            category=r.category,
            text=r.text,
            tags=[],
        )
        for r in rows
    ]


def _format_transcript(messages: list) -> str:
    lines = []
    for m in messages:
        role = m.get("role", "")
        content = (m.get("content") or "").strip()
        if not content:
            continue
        if role == "user":
            lines.append(f"【候选人】\n{content}\n")
        elif role == "assistant":
            lines.append(f"【面试官】\n{content}\n")
    return "\n---\n\n".join(lines)


@router.get("/question-categories", response_model=schemas.QuestionCategoriesResponse)
async def get_question_categories():
    """可供模拟面试勾选的题目类型（与预置 JSON、生成题库分类一致）。"""
    return schemas.QuestionCategoriesResponse(categories=list(QUESTION_CATEGORIES))


@router.get("/questionnaire", response_model=schemas.QuestionnaireResponse)
async def get_questionnaire(
    job_id: int,
    resume_id: int,
    background_profile_id: Optional[int] = None,
    total: int = 7,
    seed: Optional[int] = None,
    categories: Optional[List[str]] = Query(
        None,
        description="可重复传参；仅从这些类别中随机抽样；不传则全库合并后抽样",
    ),
    db: Session = Depends(get_db),
):
    """从预置分类题库 + 本岗位专属题库合并后，为本场模拟抽样题单（不调用 LLM）。"""
    db_job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    extra = _db_job_questions_as_bank(db, job_id, resume_id, background_profile_id)
    t = max(3, min(12, total))
    cat_filter = [c for c in (categories or []) if c and str(c).strip()]
    items, cats = sample_questionnaire(
        _build_job_content(db_job),
        total=t,
        seed=seed,
        max_per_category=2,
        extra_questions=extra or None,
        category_filter=cat_filter if cat_filter else None,
    )
    md = questionnaire_to_markdown(items)
    return schemas.QuestionnaireResponse(
        categories_used=cats,
        items=[
            schemas.QuestionnaireItemResponse(id=q.id, category=q.category, text=q.text)
            for q in items
        ],
        questionnaire_markdown=md,
    )


@router.get("/bank-preview", response_model=schemas.BankPreviewResponse)
async def get_bank_preview(
    job_id: int,
    resume_id: int,
    background_profile_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """预览：全局预置题数量/按类统计 + 本岗位专属题全文（便于管理员核对）。"""
    db_job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    preset = load_question_bank()
    by_cat = Counter(q.category for q in preset)
    by_category = {c: by_cat.get(c, 0) for c in QUESTION_CATEGORIES}

    q = db.query(models.JobInterviewQuestion).filter(models.JobInterviewQuestion.job_id == job_id)
    q = q.filter(models.JobInterviewQuestion.resume_id == resume_id)
    if background_profile_id is not None:
        q = q.filter(models.JobInterviewQuestion.background_profile_id == background_profile_id)
    rows = q.order_by(models.JobInterviewQuestion.id.asc()).all()
    return schemas.BankPreviewResponse(
        categories_allowed=list(QUESTION_CATEGORIES),
        preset=schemas.PresetBankStats(total=len(preset), by_category=by_category),
        job_questions=[
            schemas.JobQuestionPreviewRow(id=r.id, category=r.category, text=r.text) for r in rows
        ],
    )


@router.delete("/job-bank", response_model=schemas.JobBankDeleteResponse)
async def clear_job_interview_bank(
    job_id: int,
    resume_id: int,
    background_profile_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    db_job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    q = db.query(models.JobInterviewQuestion).filter(models.JobInterviewQuestion.job_id == job_id)
    q = q.filter(models.JobInterviewQuestion.resume_id == resume_id)
    if background_profile_id is not None:
        q = q.filter(models.JobInterviewQuestion.background_profile_id == background_profile_id)
    n = q.delete()
    db.commit()
    return schemas.JobBankDeleteResponse(deleted=n)


@router.get("/job-bank", response_model=schemas.JobInterviewBankMetaResponse)
async def get_job_interview_bank_meta(
    job_id: int,
    resume_id: int,
    background_profile_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    db_job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    n = (
        db.query(models.JobInterviewQuestion)
        .filter(models.JobInterviewQuestion.job_id == job_id)
        .filter(models.JobInterviewQuestion.resume_id == resume_id)
        .filter(
            models.JobInterviewQuestion.background_profile_id == background_profile_id
            if background_profile_id is not None
            else models.JobInterviewQuestion.background_profile_id.is_(None)
        )
        .count()
    )
    return schemas.JobInterviewBankMetaResponse(count=n)


@router.post("/generate-bank", response_model=schemas.GenerateInterviewBankResponse)
async def generate_job_interview_bank(
    request: schemas.GenerateInterviewBankRequest,
    db: Session = Depends(get_db),
):
    """根据 JD + 简历 + 可选背景 调用 LLM 生成专属面试题并入库；之后「开始面试」抽样时会与全局题库合并。"""
    db_job = db.query(models.Job).filter(models.Job.id == request.job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    if request.replace:
        db.query(models.JobInterviewQuestion).filter(models.JobInterviewQuestion.job_id == request.job_id).filter(
            models.JobInterviewQuestion.resume_id == request.resume_id
        ).filter(
            models.JobInterviewQuestion.background_profile_id == request.background_profile_id
        ).delete()
        db.commit()

    try:
        db_resume = db.query(models.Resume).filter(models.Resume.id == request.resume_id).first()
        if not db_resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        db_bg = None
        if request.background_profile_id is not None:
            db_bg = db.query(models.UserBackground).filter(models.UserBackground.id == request.background_profile_id).first()
        dicts = await generate_job_question_dicts(
            _build_job_content(db_job),
            db_resume.content or "",
            db_bg.content if db_bg else None,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM 生成失败: {str(e)[:200]}")

    if not dicts:
        raise HTTPException(status_code=502, detail="未生成有效题目，请检查模型配置后重试")

    for d in dicts:
        db.add(
            models.JobInterviewQuestion(
                job_id=request.job_id,
                resume_id=request.resume_id,
                background_profile_id=request.background_profile_id,
                category=d["category"],
                text=d["text"],
            )
        )
    db.commit()

    total = (
        db.query(models.JobInterviewQuestion)
        .filter(models.JobInterviewQuestion.job_id == request.job_id)
        .filter(models.JobInterviewQuestion.resume_id == request.resume_id)
        .filter(models.JobInterviewQuestion.background_profile_id == request.background_profile_id)
        .count()
    )
    return schemas.GenerateInterviewBankResponse(added=len(dicts), total_for_job=total)


@router.put("/job-question", response_model=schemas.JobQuestionUpdateResponse)
async def update_job_question(
    request: schemas.JobQuestionUpdateRequest,
    db: Session = Depends(get_db),
):
    q = (
        db.query(models.JobInterviewQuestion)
        .filter(models.JobInterviewQuestion.id == request.question_id)
        .filter(models.JobInterviewQuestion.job_id == request.job_id)
        .filter(models.JobInterviewQuestion.resume_id == request.resume_id)
        .filter(models.JobInterviewQuestion.background_profile_id == request.background_profile_id)
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.text = request.text
    db.commit()
    return schemas.JobQuestionUpdateResponse(updated=1)


@router.delete("/job-question", response_model=schemas.JobQuestionDeleteResponse)
async def delete_job_question(
    request: schemas.JobQuestionDeleteRequest,
    db: Session = Depends(get_db),
):
    n = (
        db.query(models.JobInterviewQuestion)
        .filter(models.JobInterviewQuestion.id == request.question_id)
        .filter(models.JobInterviewQuestion.job_id == request.job_id)
        .filter(models.JobInterviewQuestion.resume_id == request.resume_id)
        .filter(models.JobInterviewQuestion.background_profile_id == request.background_profile_id)
        .delete()
    )
    db.commit()
    return schemas.JobQuestionDeleteResponse(deleted=n)


@router.post("/stream")
async def interview_sim_stream(request: schemas.InterviewSimRequest, db: Session = Depends(get_db)):
    db_job = db.query(models.Job).filter(models.Job.id == request.job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    db_resume = db.query(models.Resume).filter(models.Resume.id == request.resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if db_resume.job_id != request.job_id:
        raise HTTPException(status_code=400, detail="Resume does not belong to this job")

    messages = [msg.model_dump() for msg in request.messages]

    return StreamingResponse(
        _stream_sim(
            job_content=_build_job_content(db_job),
            resume_content=db_resume.content or "",
            messages=messages,
            user_background=request.user_background,
            questionnaire_markdown=request.questionnaire_markdown,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/report", response_model=schemas.InterviewReportResponse)
async def interview_sim_report(request: schemas.InterviewReportRequest, db: Session = Depends(get_db)):
    db_job = db.query(models.Job).filter(models.Job.id == request.job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    db_resume = db.query(models.Resume).filter(models.Resume.id == request.resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    if db_resume.job_id != request.job_id:
        raise HTTPException(status_code=400, detail="Resume does not belong to this job")

    job_content = _build_job_content(db_job)
    resume_content = db_resume.content or ""
    transcript = _format_transcript([m.model_dump() for m in request.messages])
    if not transcript.strip():
        raise HTTPException(status_code=400, detail="No interview content to analyze")

    context_parts = [
        f"## 岗位 JD\n\n{job_content}",
        f"## 候选人简历\n\n{resume_content}",
        f"## 模拟面试对话记录\n\n{transcript}",
    ]
    if request.user_background:
        context_parts.append(f"## 候选人补充经历\n\n{request.user_background}")

    context = "\n\n---\n\n".join(context_parts)
    system = f"{INTERVIEW_REPORT_SYSTEM}\n\n---\n\n{context}"

    user_msg = "请根据以上材料生成面试复盘报告（Markdown）。直接输出报告正文，不要前言套话。"
    report_md = await complete_response(system, [{"role": "user", "content": user_msg}])

    return schemas.InterviewReportResponse(report=report_md)

