"""
根据岗位 JD 调用当前已配置的 LLM，生成岗位专属面试题（JSON）。
"""
from __future__ import annotations

import json
import re
from typing import Dict, List, Optional

from providers import complete_response
from interview_question_bank import QUESTION_CATEGORIES

ALLOWED_CATEGORIES = frozenset(QUESTION_CATEGORIES)

GENERATE_BANK_SYSTEM = (
    """# 角色
你是资深招聘与面试设计顾问，擅长根据岗位 JD 与候选人简历（以及可选的背景补充）设计高信噪比的面试问题。

# 任务
基于系统消息里提供的：岗位 JD、候选人简历全文、以及可选补充经历，输出一个 JSON 数组，用于「模拟面试」题库。
不要输出任何 JSON 以外的文字。

# JSON 格式
数组中每个元素为对象，仅含两个字符串字段：
- category：必须是以下之一（严格一致）：
"""
    + "、".join(QUESTION_CATEGORIES)
    + """
- text：口语化、适合现场追问的一句或一小段面试问题（中文）

# 要求
- 共 14～18 道题，类别尽量覆盖全面，且紧扣 JD 中的重点，同时优先围绕候选人简历里“已经出现”的经历与表述去设计问题。
- 不要重复题干；不要编造简历中没有的事实细节作为前提。
- 题目文本不要出现“《JD》/《简历》”等字样；直接给可问的问题本身。
- 禁止 Markdown 代码块包裹，禁止注释。"""
)


def _strip_code_fence(raw: str) -> str:
    s = raw.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```\s*$", "", s)
    return s.strip()


def parse_llm_question_list(raw: str) -> List[dict]:
    """解析 LLM 返回的 JSON 数组。"""
    s = _strip_code_fence(raw)
    data = json.loads(s)
    if not isinstance(data, list):
        raise ValueError("expected JSON array")
    out: List[dict] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        cat = str(item.get("category", "")).strip()
        text = str(item.get("text", "")).strip()
        if not text:
            continue
        if cat not in ALLOWED_CATEGORIES:
            cat = "综合"
        out.append({"category": cat, "text": text})
    return out


async def generate_job_question_dicts(
    job_content: str,
    resume_content: str,
    user_background: Optional[str] = None,
) -> List[Dict[str, str]]:
    jd = (job_content or "").strip() or "（JD 为空，请输出通用职场面试题）"
    resume = (resume_content or "").strip() or "（简历为空，请输出通用职场面试问题）"

    parts = [f"## 岗位 JD\n\n{jd}", f"## 候选人简历\n\n{resume}"]
    if user_background:
        parts.append(f"## 候选人补充经历\n\n{user_background}")
    context = "\n\n---\n\n".join(parts)

    user_msg = f"{context}\n\n请输出符合要求的 JSON 数组。"
    raw = await complete_response(
        GENERATE_BANK_SYSTEM,
        [{"role": "user", "content": user_msg}],
    )
    return parse_llm_question_list(raw)
