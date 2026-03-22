"""
通义千问（DashScope OpenAI 兼容模式）非流式单次对话，供简历解析等场景使用。
"""
from typing import List, Dict, Any

from openai import OpenAI

DASHSCOPE_COMPAT_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1"


def qwen_chat_completion(
    api_key: str,
    model: str,
    messages: List[Dict[str, Any]],
    *,
    max_tokens: int = 8192,
    timeout: float = 120.0,
) -> str:
    """
    同步调用 chat.completions，返回 assistant 文本。
    messages 可为多模态（含 image_url + text）。
    """
    client = OpenAI(
        base_url=DASHSCOPE_COMPAT_BASE,
        api_key=api_key,
        timeout=timeout,
    )
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        stream=False,
        max_tokens=max_tokens,
    )
    choice = resp.choices[0].message
    return (choice.content or "").strip()
