from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.get("", response_model=List[schemas.ResumeResponse])
def list_resumes(
    job_id: int = None,
    background_profile_id: int = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.Resume)
    if job_id:
        query = query.filter(models.Resume.job_id == job_id)
    if background_profile_id is not None:
        # 兼容旧数据：老版本简历 background_profile_id 可能为空，允许一并展示
        query = query.filter(
            (models.Resume.background_profile_id == background_profile_id)
            | (models.Resume.background_profile_id.is_(None))
        )
    return query.order_by(models.Resume.created_at.desc()).all()


@router.post("", response_model=schemas.ResumeResponse)
def create_resume(resume: schemas.ResumeCreate, db: Session = Depends(get_db)):
    db_job = db.query(models.Job).filter(models.Job.id == resume.job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    bg_id = resume.background_profile_id
    angle = (resume.angle or '').strip() if resume.angle else None
    # 自动分配角度：同一候选人 + 同一岗位下，按已有简历数量依次分配角度编号
    if not angle:
        q = db.query(models.Resume).filter(models.Resume.job_id == resume.job_id)
        if bg_id is not None:
            q = q.filter(models.Resume.background_profile_id == bg_id)
        else:
            q = q.filter(models.Resume.background_profile_id.is_(None))
        angle_index = q.count() + 1
        angle = f"角度{angle_index}"

    existing_count = db.query(models.Resume).filter(models.Resume.job_id == resume.job_id)
    if bg_id is not None:
        existing_count = existing_count.filter(models.Resume.background_profile_id == bg_id)
    else:
        existing_count = existing_count.filter(models.Resume.background_profile_id.is_(None))
    existing_count = existing_count.filter(models.Resume.angle == angle).count()

    db_resume = models.Resume(
        **resume.model_dump(),
        angle=angle,
        background_profile_id=bg_id,
        title=_build_resume_title_with_angle(db_job, resume.title, angle),
        version=existing_count + 1,
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume


def _build_resume_title_with_angle(db_job: models.Job, title: Optional[str], angle: str) -> str:
    base = (title or '').strip()
    if not base:
        base = db_job.title or '岗位'
    # 如果标题里已经包含角度标记，避免重复追加
    if angle and angle not in base:
        return f"{base} · {angle}"
    return base


@router.get("/{resume_id}", response_model=schemas.ResumeResponse)
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    db_resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return db_resume


@router.put("/{resume_id}", response_model=schemas.ResumeResponse)
def update_resume(resume_id: int, resume: schemas.ResumeUpdate, db: Session = Depends(get_db)):
    db_resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    update_data = resume.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_resume, field, value)
    db.commit()
    db.refresh(db_resume)
    return db_resume


@router.delete("/{resume_id}")
def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    db_resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    db.delete(db_resume)
    db.commit()
    return {"message": "Resume deleted"}
