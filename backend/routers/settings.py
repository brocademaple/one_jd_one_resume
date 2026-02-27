from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Optional

from providers import PROVIDERS, get_api_key, load_settings, save_settings, sync_env_file, test_connection

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsTest(BaseModel):
    provider: str
    model: str
    api_key: Optional[str] = None


class SettingsUpdate(BaseModel):
    provider: str
    model: str
    api_keys: Optional[Dict[str, str]] = None


@router.get("")
def get_settings():
    settings = load_settings()
    # 已设置 = 来自 ai_settings 或 .env 任一有值即显示 ••••••
    masked = {
        p: ("••••••" if get_api_key(p, settings) else "")
        for p in PROVIDERS
    }
    return {
        "provider": settings["provider"],
        "model": settings["model"],
        "api_keys_set": masked,
        "providers": PROVIDERS,
    }


@router.post("/test")
async def test_api_connection(body: SettingsTest):
    """Test if the configured API key can connect successfully."""
    success, message = await test_connection(
        provider=body.provider,
        model=body.model,
        api_key_override=body.api_key,
    )
    return {"success": success, "message": message}


@router.put("")
def update_settings(body: SettingsUpdate):
    settings = load_settings()
    settings["provider"] = body.provider
    settings["model"] = body.model

    to_sync = {}
    if body.api_keys:
        for k, v in body.api_keys.items():
            if v == "••••••":
                continue  # 占位，不覆盖
            settings["api_keys"][k] = v
            # 仅同步非空值到 .env，避免误清空；清除用 DELETE 接口
            if v and v.strip():
                to_sync[k] = v.strip()

    save_settings(settings)
    if to_sync:
        sync_env_file(to_sync)
    return {"message": "Settings saved"}


@router.delete("/api-key/{provider}")
def clear_api_key(provider: str):
    settings = load_settings()
    if provider in settings.get("api_keys", {}):
        settings["api_keys"][provider] = ""
        save_settings(settings)
        sync_env_file({provider: ""})
    return {"message": f"API key for {provider} cleared"}
