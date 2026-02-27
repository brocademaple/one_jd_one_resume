from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/background", tags=["background"])


@router.get("", response_model=schemas.UserBackgroundResponse)
def get_user_background(db: Session = Depends(get_db)):
    """Get user background. Returns the first (and only) record."""
    bg = db.query(models.UserBackground).first()
    if not bg:
        # Create default empty background if none exists
        bg = models.UserBackground(content="")
        db.add(bg)
        db.commit()
        db.refresh(bg)
    return bg


@router.put("", response_model=schemas.UserBackgroundResponse)
def update_user_background(
    body: schemas.UserBackgroundUpdate, db: Session = Depends(get_db)
):
    """Update user background content."""
    bg = db.query(models.UserBackground).first()
    if not bg:
        bg = models.UserBackground(content=body.content)
        db.add(bg)
    else:
        bg.content = body.content
    db.commit()
    db.refresh(bg)
    return bg
