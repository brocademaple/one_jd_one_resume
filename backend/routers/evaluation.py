import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from providers import complete_response
from routers.chat import _build_job_content

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])

EVAL_SYSTEM_PROMPT = """你是资深 HRBP 与招聘评估官。请输出结构化 JSON 评分卡，且每个结论都必须给证据引用。

输出 JSON 对象字段：
- overall_score: 0-100 整数
- overall_summary: 字符串
- items: 数组，每项包含
  - competency: 能力项名称
  - score: 0-100 整数
  - confidence: 高/中/低
  - summary: 结论摘要
  - evidence: 数组，每项包含 source(可选: JD/简历/对话), quote(证据原文), why(为什么能支持结论)
  - gap: 能力差距（可选）
  - suggestion: 改进建议（可选）
- needs_verification: 数组，列出证据不足、需要候选人继续验证的点

严格要求：
1) 不得输出 JSON 之外内容。
2) 若证据不足，不要臆断，写入 needs_verification。
3) 不能出现歧视性判断，不涉及年龄、婚育、民族、宗教等受保护属性。
"""

_COMPETENCY_MODELS: Dict[str, List[str]] = {}


def _load_competency_models() -> Dict[str, List[str]]:
    global _COMPETENCY_MODELS
    if _COMPETENCY_MODELS:
        return _COMPETENCY_MODELS
    fp = Path(__file__).resolve().parents[1] / "data" / "competency_models.json"
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            _COMPETENCY_MODELS = {
                str(k): [str(x) for x in v if str(x).strip()]
                for k, v in data.items()
                if isinstance(v, list)
            }
    except Exception:
        _COMPETENCY_MODELS = {}
    return _COMPETENCY_MODELS


def _pick_competency_set(job_title: str) -> List[str]:
    models = _load_competency_models()
    title = (job_title or "").lower()
    if any(k in title for k in ["产品", "product", "pm"]):
        return models.get("product", models.get("default", []))
    if any(k in title for k in ["开发", "工程", "engineer", "后端", "前端"]):
        return models.get("engineering", models.get("default", []))
    if any(k in title for k in ["运营", "operation"]):
        return models.get("operations", models.get("default", []))
    return models.get("default", [])


def _pick_competency_set_by_profile(profile: str, job_title: str) -> List[str]:
    models = _load_competency_models()
    p = (profile or "").strip()
    if p and p in models:
        return models[p]
    return _pick_competency_set(job_title)


def _strip_code_fence(s: str) -> str:
    s = (s or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```\s*$", "", s)
    return s.strip()


def _normalize_scorecard(data: Dict[str, Any]) -> schemas.EvaluationScorecardResponse:
    overall_score = int(max(0, min(100, int(data.get("overall_score", 0)))))
    overall_summary = str(data.get("overall_summary", "")).strip()
    needs_verification = [str(x).strip() for x in data.get("needs_verification", []) if str(x).strip()]
    items_raw = data.get("items", []) if isinstance(data.get("items", []), list) else []
    items: List[schemas.ScoreCardItem] = []
    for it in items_raw:
        if not isinstance(it, dict):
            continue
        ev_list = it.get("evidence", []) if isinstance(it.get("evidence", []), list) else []
        evidence: List[schemas.EvidenceRef] = []
        for ev in ev_list:
            if not isinstance(ev, dict):
                continue
            quote = str(ev.get("quote", "")).strip()
            if not quote:
                continue
            evidence.append(
                schemas.EvidenceRef(
                    source=str(ev.get("source", "对话")).strip() or "对话",
                    quote=quote,
                    why=str(ev.get("why", "")).strip() or None,
                )
            )
        items.append(
            schemas.ScoreCardItem(
                competency=str(it.get("competency", "综合能力")).strip() or "综合能力",
                score=int(max(0, min(100, int(it.get("score", 0))))),
                confidence=str(it.get("confidence", "中")).strip() or "中",
                summary=str(it.get("summary", "")).strip(),
                evidence=evidence,
                gap=str(it.get("gap", "")).strip() or None,
                suggestion=str(it.get("suggestion", "")).strip() or None,
            )
        )
    return schemas.EvaluationScorecardResponse(
        overall_score=overall_score,
        overall_summary=overall_summary,
        items=items,
        needs_verification=needs_verification,
    )


@router.post("/scorecard", response_model=schemas.EvaluationScorecardResponse)
async def generate_scorecard(request: schemas.EvaluationScorecardRequest, db: Session = Depends(get_db)):
    db_job = db.query(models.Job).filter(models.Job.id == request.job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")
    db_resume = db.query(models.Resume).filter(models.Resume.id == request.resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    parts = [
        f"## 岗位 JD\n\n{_build_job_content(db_job)}",
        f"## 候选人简历\n\n{db_resume.content or ''}",
    ]
    if request.user_background:
        parts.append(f"## 候选人背景补充\n\n{request.user_background}")
    if request.transcript:
        parts.append(f"## 模拟面试对话摘录\n\n{request.transcript}")
    competency_set = _pick_competency_set_by_profile(getattr(db_job, "competency_profile", "default"), db_job.title or "")
    competency_text = "、".join(competency_set) if competency_set else "综合能力、岗位匹配、风险识别、改进建议"
    user_msg = (
        "\n\n---\n\n".join(parts)
        + f"\n\n请优先围绕以下能力项生成评分卡：{competency_text}\n\n请输出评分卡 JSON。"
    )

    try:
        raw = await complete_response(EVAL_SYSTEM_PROMPT, [{"role": "user", "content": user_msg}])
        data = json.loads(_strip_code_fence(raw))
        if not isinstance(data, dict):
            raise ValueError("invalid json object")
        normalized = _normalize_scorecard(data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"评分卡生成失败: {str(e)[:180]}")

    db.add(
        models.EvaluationReport(
            job_id=request.job_id,
            resume_id=request.resume_id,
            report_type="scorecard",
            content_json=json.dumps(normalized.model_dump(), ensure_ascii=False),
        )
    )
    db.commit()
    return normalized


@router.get("/scorecard-history", response_model=List[schemas.EvaluationReportListItem])
def list_scorecard_history(job_id: int, resume_id: Optional[int] = None, limit: int = 20, db: Session = Depends(get_db)):
    limit = max(1, min(100, int(limit)))
    q = (
        db.query(models.EvaluationReport)
        .filter(models.EvaluationReport.job_id == job_id)
        .filter(models.EvaluationReport.report_type == "scorecard")
    )
    if resume_id is not None:
        q = q.filter(models.EvaluationReport.resume_id == resume_id)
    return q.order_by(models.EvaluationReport.created_at.desc()).limit(limit).all()


@router.get("/scorecard-history/{report_id}", response_model=schemas.EvaluationReportListItem)
def get_scorecard_history_item(report_id: int, db: Session = Depends(get_db)):
    row = db.query(models.EvaluationReport).filter(models.EvaluationReport.id == report_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Scorecard report not found")
    return row

