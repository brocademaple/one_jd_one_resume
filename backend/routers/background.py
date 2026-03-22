from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/background", tags=["background"])


@router.get("/profiles", response_model=List[schemas.BackgroundProfileResponse])
def list_background_profiles(db: Session = Depends(get_db)):
    """列出全部人物背景档案；若为空则自动创建一条「默认」。"""
    rows = (
        db.query(models.UserBackground)
        .order_by(models.UserBackground.id.asc())
        .all()
    )
    if not rows:
        bg = models.UserBackground(name="默认", content="")
        db.add(bg)
        db.commit()
        db.refresh(bg)
        rows = [bg]
    return rows


@router.post("/profiles", response_model=schemas.BackgroundProfileResponse)
def create_background_profile(
    body: schemas.BackgroundProfileCreate,
    db: Session = Depends(get_db),
):
    name = (body.name or "").strip() or "新档案"
    bg = models.UserBackground(name=name, content=body.content or "")
    db.add(bg)
    db.commit()
    db.refresh(bg)
    return bg


@router.put("/profiles/{profile_id}", response_model=schemas.BackgroundProfileResponse)
def update_background_profile(
    profile_id: int,
    body: schemas.BackgroundProfileUpdate,
    db: Session = Depends(get_db),
):
    bg = db.query(models.UserBackground).filter(models.UserBackground.id == profile_id).first()
    if not bg:
        raise HTTPException(status_code=404, detail="Profile not found")
    if body.name is not None:
        t = body.name.strip()
        if t:
            bg.name = t
    if body.content is not None:
        bg.content = body.content
    db.commit()
    db.refresh(bg)
    return bg


@router.delete("/profiles/{profile_id}")
def delete_background_profile(profile_id: int, db: Session = Depends(get_db)):
    count = db.query(models.UserBackground).count()
    if count <= 1:
        raise HTTPException(status_code=400, detail="至少保留一份背景档案")
    bg = db.query(models.UserBackground).filter(models.UserBackground.id == profile_id).first()
    if not bg:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(bg)
    db.commit()
    return {"ok": True, "id": profile_id}
