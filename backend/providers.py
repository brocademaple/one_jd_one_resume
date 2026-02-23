"""
Multi-provider AI abstraction layer.
Supports Anthropic Claude, Qwen, Zhipu GLM, DeepSeek, Moonshot (Kimi), Baidu ERNIE.
"""
import json
import os
from typing import AsyncGenerator
import anthropic
from openai import AsyncOpenAI

# ──────────────────────────────────────────────
#  Provider catalogue
# ──────────────────────────────────────────────
PROVIDERS: dict = {
    "anthropic": {
        "name": "Anthropic Claude",
        "name_cn": "Claude",
        "type": "anthropic",
        "env_key": "ANTHROPIC_API_KEY",
        "models": [
            {"id": "claude-opus-4-6",   "name": "Claude Opus 4.6 (最强)"},
            {"id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6 (均衡)"},
            {"id": "claude-haiku-4-5",  "name": "Claude Haiku 4.5 (快速)"},
        ],
        "default_model": "claude-opus-4-6",
    },
    "qwen": {
        "name": "通义千问 (Qwen)",
        "name_cn": "通义千问",
        "type": "openai_compat",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "env_key": "DASHSCOPE_API_KEY",
        "models": [
            {"id": "qwen-max",         "name": "Qwen Max (最强)"},
            {"id": "qwen-plus",        "name": "Qwen Plus (均衡)"},
            {"id": "qwen-turbo",       "name": "Qwen Turbo (快速)"},
            {"id": "qwen-long",        "name": "Qwen Long (长文本)"},
            {"id": "qwen3-235b-a22b",  "name": "Qwen3-235B (最新)"},
            {"id": "qwen3-32b",        "name": "Qwen3-32B"},
        ],
        "default_model": "qwen-plus",
    },
    "zhipu": {
        "name": "智谱 GLM",
        "name_cn": "智谱",
        "type": "openai_compat",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "env_key": "ZHIPU_API_KEY",
        "models": [
            {"id": "glm-4-plus",  "name": "GLM-4-Plus (旗舰)"},
            {"id": "glm-4",       "name": "GLM-4"},
            {"id": "glm-4-flash", "name": "GLM-4-Flash (快速免费)"},
            {"id": "glm-4-air",   "name": "GLM-4-Air"},
            {"id": "glm-z1-plus", "name": "GLM-Z1-Plus (推理)"},
        ],
        "default_model": "glm-4-flash",
    },
    "deepseek": {
        "name": "DeepSeek",
        "name_cn": "DeepSeek",
        "type": "openai_compat",
        "base_url": "https://api.deepseek.com/v1",
        "env_key": "DEEPSEEK_API_KEY",
        "models": [
            {"id": "deepseek-chat",     "name": "DeepSeek V3 (对话)"},
            {"id": "deepseek-reasoner", "name": "DeepSeek R1 (推理)"},
        ],
        "default_model": "deepseek-chat",
    },
    "moonshot": {
        "name": "Moonshot (Kimi)",
        "name_cn": "Kimi",
        "type": "openai_compat",
        "base_url": "https://api.moonshot.cn/v1",
        "env_key": "MOONSHOT_API_KEY",
        "models": [
            {"id": "moonshot-v1-128k", "name": "Moonshot 128K (推荐)"},
            {"id": "moonshot-v1-32k",  "name": "Moonshot 32K"},
            {"id": "moonshot-v1-8k",   "name": "Moonshot 8K (快速)"},
        ],
        "default_model": "moonshot-v1-128k",
    },
    "baidu": {
        "name": "百度文心 (ERNIE)",
        "name_cn": "文心",
        "type": "openai_compat",
        "base_url": "https://qianfan.baidubce.com/v2",
        "env_key": "QIANFAN_API_KEY",
        "models": [
            {"id": "ernie-4.0-8k",          "name": "ERNIE 4.0 (旗舰)"},
            {"id": "ernie-4.0-turbo-8k",     "name": "ERNIE 4.0 Turbo"},
            {"id": "ernie-3.5-8k",           "name": "ERNIE 3.5"},
            {"id": "ernie-speed-128k",        "name": "ERNIE Speed (长文本)"},
        ],
        "default_model": "ernie-4.0-turbo-8k",
    },
}

# Path for persisted settings
SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "ai_settings.json")

_DEFAULT_SETTINGS = {
    "provider": "anthropic",
    "model": "claude-opus-4-6",
    "api_keys": {k: "" for k in PROVIDERS},
}


# ──────────────────────────────────────────────
#  Settings I/O
# ──────────────────────────────────────────────
def load_settings() -> dict:
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
            # merge to ensure all keys present
            settings = dict(_DEFAULT_SETTINGS)
            settings.update(saved)
            settings["api_keys"] = {**_DEFAULT_SETTINGS["api_keys"], **saved.get("api_keys", {})}
            return settings
        except Exception:
            pass
    return dict(_DEFAULT_SETTINGS)


def save_settings(settings: dict) -> None:
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)


def get_api_key(provider: str, settings: dict) -> str:
    """Return API key: first from settings file, then from env var."""
    key_from_settings = settings.get("api_keys", {}).get(provider, "")
    if key_from_settings:
        return key_from_settings
    env_var = PROVIDERS[provider].get("env_key", "")
    return os.environ.get(env_var, "")


# ──────────────────────────────────────────────
#  Streaming generators
# ──────────────────────────────────────────────
async def _stream_anthropic(
    api_key: str,
    model: str,
    system: str,
    messages: list,
) -> AsyncGenerator[str, None]:
    client = anthropic.AsyncAnthropic(api_key=api_key)

    # Adaptive thinking only on Opus models
    extra: dict = {}
    if "opus" in model:
        extra["thinking"] = {"type": "adaptive"}

    async with client.messages.stream(
        model=model,
        max_tokens=8192,
        system=system,
        messages=messages,
        **extra,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def _stream_openai_compat(
    base_url: str,
    api_key: str,
    model: str,
    system: str,
    messages: list,
) -> AsyncGenerator[str, None]:
    client = AsyncOpenAI(base_url=base_url, api_key=api_key)

    openai_messages = [{"role": "system", "content": system}] + messages

    stream = await client.chat.completions.create(
        model=model,
        messages=openai_messages,
        stream=True,
        max_tokens=8192,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


async def stream_response(
    system: str,
    messages: list,
) -> AsyncGenerator[str, None]:
    """Load current settings and stream using the configured provider/model."""
    settings = load_settings()
    provider = settings.get("provider", "anthropic")
    model = settings.get("model", PROVIDERS["anthropic"]["default_model"])
    api_key = get_api_key(provider, settings)

    if not api_key:
        yield f"⚠️ 未配置 {PROVIDERS[provider]['name']} 的 API Key，请点击右上角设置按钮填写。"
        return

    pconfig = PROVIDERS.get(provider)
    if not pconfig:
        yield f"⚠️ 不支持的 Provider: {provider}"
        return

    if pconfig["type"] == "anthropic":
        async for text in _stream_anthropic(api_key, model, system, messages):
            yield text
    else:
        async for text in _stream_openai_compat(
            pconfig["base_url"], api_key, model, system, messages
        ):
            yield text
