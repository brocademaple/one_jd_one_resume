"""
预置面试题库：加载 JSON、按 JD 关键词加权、分层抽样生成本场题单。
"""
from __future__ import annotations

import json
import random
from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Tuple

from pydantic import BaseModel, Field

_BANK_PATH = Path(__file__).resolve().parent / "data" / "interview_question_bank.json"

# 与 JSON 题库、LLM 生成分类保持一致；API 与前端抽样筛选用
QUESTION_CATEGORIES: List[str] = [
    "自我介绍",
    "行为面试",
    "技术深挖",
    "情景题",
    "反向提问",
    "综合",
]


class BankQuestion(BaseModel):
    id: str
    category: str
    text: str
    tags: List[str] = Field(default_factory=list)


class QuestionBankFile(BaseModel):
    version: int = 1
    questions: List[BankQuestion]


@lru_cache(maxsize=1)
def load_question_bank() -> List[BankQuestion]:
    if not _BANK_PATH.exists():
        return []
    raw = json.loads(_BANK_PATH.read_text(encoding="utf-8"))
    doc = QuestionBankFile.model_validate(raw)
    return doc.questions


def _jd_keyword_hits(jd_lower: str, tags: List[str]) -> int:
    if not tags:
        return 0
    hits = 0
    for t in tags:
        if t and t.lower() in jd_lower:
            hits += 1
    return hits


def _weighted_sample_without_replacement(
    items: List[Tuple[BankQuestion, float]],
    k: int,
    rng: random.Random,
) -> List[BankQuestion]:
    if k <= 0 or not items:
        return []
    pool = list(items)
    out: List[BankQuestion] = []
    for _ in range(min(k, len(pool))):
        total = sum(w for _, w in pool)
        if total <= 0:
            i = rng.randrange(len(pool))
        else:
            r = rng.uniform(0, total)
            acc = 0.0
            i = 0
            for idx, (_, w) in enumerate(pool):
                acc += max(w, 0.001)
                if r <= acc:
                    i = idx
                    break
        out.append(pool[i][0])
        pool.pop(i)
    return out


def sample_questionnaire(
    jd_text: str,
    total: int = 7,
    seed: Optional[int] = None,
    max_per_category: int = 2,
    extra_questions: Optional[List[BankQuestion]] = None,
    category_filter: Optional[List[str]] = None,
) -> Tuple[List[BankQuestion], List[str]]:
    """
    分层抽样：先尽量每类抽 1 题，再按类上限补足，最后从剩余池补满 total。
    带 tags 的题目若与 JD 小写文本匹配则权重略增。
    extra_questions：岗位专属题库，与预置 JSON 合并；id 以 jobq- 开头时略提高权重。
    category_filter：非空时只从指定类别中抽样；若过滤后为空则回退为全量池。
    """
    all_q = list(load_question_bank())
    if extra_questions:
        all_q.extend(extra_questions)
    if not all_q:
        return [], []

    if category_filter:
        cf = {c.strip() for c in category_filter if c and str(c).strip()}
        if cf:
            filtered = [q for q in all_q if q.category in cf]
            if filtered:
                all_q = filtered

    rng = random.Random(seed)
    jd_lower = (jd_text or "").lower()

    by_cat: defaultdict[str, list[BankQuestion]] = defaultdict(list)
    for q in all_q:
        by_cat[q.category].append(q)

    categories = list(by_cat.keys())
    rng.shuffle(categories)

    picked: List[BankQuestion] = []
    picked_ids: set[str] = set()

    def weight_pool(pool: List[BankQuestion]) -> List[Tuple[BankQuestion, float]]:
        out: List[Tuple[BankQuestion, float]] = []
        for q in pool:
            w = 1.0 + 0.35 * _jd_keyword_hits(jd_lower, q.tags)
            if q.id.startswith("jobq-"):
                w *= 1.4
            out.append((q, w))
        return out

    # 第一轮：每类至多 1 题，增加覆盖面
    for cat in categories:
        if len(picked) >= total:
            break
        pool = [q for q in by_cat[cat] if q.id not in picked_ids]
        if not pool:
            continue
        one = _weighted_sample_without_replacement(weight_pool(pool), 1, rng)
        if one:
            picked.append(one[0])
            picked_ids.add(one[0].id)

    # 第二轮：每类补到 max_per_category，且总数不超过 total
    for cat in categories:
        while len(picked) < total:
            n_cat = sum(1 for x in picked if x.category == cat)
            if n_cat >= max_per_category:
                break
            pool = [q for q in by_cat[cat] if q.id not in picked_ids]
            if not pool:
                break
            one = _weighted_sample_without_replacement(weight_pool(pool), 1, rng)
            if not one:
                break
            picked.append(one[0])
            picked_ids.add(one[0].id)

    # 第三轮：任意剩余题目补满 total
    rest = [q for q in all_q if q.id not in picked_ids]
    rng.shuffle(rest)
    weighted_rest = weight_pool(rest)
    need = total - len(picked)
    if need > 0 and weighted_rest:
        extra = _weighted_sample_without_replacement(weighted_rest, min(need, len(weighted_rest)), rng)
        picked.extend(extra)
        for q in extra:
            picked_ids.add(q.id)

    if len(picked) > total:
        picked = rng.sample(picked, total)

    used_cats: List[str] = []
    seen: set[str] = set()
    for q in picked:
        if q.category not in seen:
            seen.add(q.category)
            used_cats.append(q.category)

    return picked, used_cats


def questionnaire_to_markdown(items: List[BankQuestion]) -> str:
    lines = [
        "## 本场须覆盖的题单（按序自然推进，可追问；不必一字不差复述题干）",
        "",
    ]
    for i, q in enumerate(items, start=1):
        lines.append(f"{i}. **【{q.category}】** {q.text}")
    return "\n".join(lines)
