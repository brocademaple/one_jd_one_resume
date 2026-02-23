import json
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import anthropic

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/chat", tags=["chat"])

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """你是一位专业的简历定制顾问和职业规划师。你的核心职责是：

1. **简历定制**：根据岗位JD（Job Description）和用户的个人经历，帮助定制专业、有针对性的简历
2. **内容优化**：突出与岗位最相关的技能、经历和成就，使用量化数据增强说服力
3. **面试技巧**：提供针对该岗位的面试准备建议、常见问题及回答策略
4. **简历管理**：帮助用户维护和更新简历内容

当用户需要生成或修改简历时，请使用Markdown格式输出完整的简历内容，并在简历内容前后用 `===RESUME_START===` 和 `===RESUME_END===` 标记包裹，方便系统提取。

输出简历时的格式要求：
- 使用清晰的Markdown标题结构
- 包含：个人信息、职业摘要、工作经历、教育背景、技能等核心模块
- 工作经历使用STAR法则描述（情况-任务-行动-结果）
- 技能部分突出与JD要求最匹配的内容

请用中文回复，保持专业、友好的沟通风格。"""


async def stream_chat(
    job_content: str,
    resume_content: str,
    messages: list,
    user_background: str = None
):
    context_parts = [f"## 目标岗位JD\n\n{job_content}"]

    if resume_content:
        context_parts.append(f"## 当前简历内容\n\n{resume_content}")

    if user_background:
        context_parts.append(f"## 用户补充的个人经历\n\n{user_background}")

    context = "\n\n---\n\n".join(context_parts)
    system_with_context = f"{SYSTEM_PROMPT}\n\n---\n\n{context}"

    api_messages = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in messages
    ]

    with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=8192,
        thinking={"type": "adaptive"},
        system=system_with_context,
        messages=api_messages,
    ) as stream:
        for text in stream.text_stream:
            yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@router.post("/stream")
async def chat_stream(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    db_job = db.query(models.Job).filter(models.Job.id == request.job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    db_resume = db.query(models.Resume).filter(models.Resume.id == request.resume_id).first()
    resume_content = db_resume.content if db_resume else ""

    messages = [msg.model_dump() for msg in request.messages]

    return StreamingResponse(
        stream_chat(
            job_content=db_job.content,
            resume_content=resume_content,
            messages=messages,
            user_background=request.user_background
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/conversations/{resume_id}", response_model=schemas.ConversationResponse)
def get_conversation(resume_id: int, db: Session = Depends(get_db)):
    db_conv = db.query(models.Conversation).filter(
        models.Conversation.resume_id == resume_id
    ).first()
    if not db_conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return db_conv


@router.post("/conversations")
def save_conversation(
    resume_id: int,
    messages: list,
    db: Session = Depends(get_db)
):
    db_conv = db.query(models.Conversation).filter(
        models.Conversation.resume_id == resume_id
    ).first()

    if db_conv:
        db_conv.messages = json.dumps(messages, ensure_ascii=False)
    else:
        db_conv = models.Conversation(
            resume_id=resume_id,
            messages=json.dumps(messages, ensure_ascii=False)
        )
        db.add(db_conv)

    db.commit()
    return {"message": "Conversation saved"}
