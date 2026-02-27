from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/resumes", tags=["resumes"])


@router.get("", response_model=List[schemas.ResumeResponse])
def list_resumes(job_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.Resume)
    if job_id:
        query = query.filter(models.Resume.job_id == job_id)
    return query.order_by(models.Resume.created_at.desc()).all()


@router.post("", response_model=schemas.ResumeResponse)
def create_resume(resume: schemas.ResumeCreate, db: Session = Depends(get_db)):
    db_job = db.query(models.Job).filter(models.Job.id == resume.job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing_count = db.query(models.Resume).filter(
        models.Resume.job_id == resume.job_id
    ).count()

    db_resume = models.Resume(
        **resume.model_dump(),
        version=existing_count + 1
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume


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
