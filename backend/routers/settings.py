from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Optional

from providers import PROVIDERS, load_settings, save_settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    provider: str
    model: str
    api_keys: Optional[Dict[str, str]] = None


@router.get("")
def get_settings():
    settings = load_settings()
    # Mask API keys in response: show only whether they're set
    masked = {
        k: ("••••••" if v else "") for k, v in settings.get("api_keys", {}).items()
    }
    return {
        "provider": settings["provider"],
        "model": settings["model"],
        "api_keys_set": masked,
        "providers": PROVIDERS,
    }


@router.put("")
def update_settings(body: SettingsUpdate):
    settings = load_settings()
    settings["provider"] = body.provider
    settings["model"] = body.model

    if body.api_keys:
        for k, v in body.api_keys.items():
            # Only update if non-empty (don't clear keys accidentally)
            if v and v != "••••••":
                settings["api_keys"][k] = v

    save_settings(settings)
    return {"message": "Settings saved"}


@router.delete("/api-key/{provider}")
def clear_api_key(provider: str):
    settings = load_settings()
    if provider in settings.get("api_keys", {}):
        settings["api_keys"][provider] = ""
        save_settings(settings)
    return {"message": f"API key for {provider} cleared"}
