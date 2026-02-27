from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


JOB_STATUS = ["pending", "screening", "screening_fail", "interviewing", "interview_fail", "offered"]


class JobBase(BaseModel):
    title: str
    company: Optional[str] = None
    job_url: Optional[str] = None
    salary: Optional[str] = None
    content: str
    status: Optional[str] = "pending"


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    job_url: Optional[str] = None
    salary: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None


class JobResponse(JobBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ResumeBase(BaseModel):
    title: Optional[str] = None
    content: str
    job_id: int


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class ResumeResponse(ResumeBase):
    id: int
    version: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    resume_id: int


class ConversationSave(BaseModel):
    resume_id: int
    messages: List[dict]


class MessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    resume_id: int
    job_id: int
    messages: List[MessageItem]
    user_background: Optional[str] = None


class ConversationResponse(BaseModel):
    id: int
    resume_id: int
    messages: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserBackgroundResponse(BaseModel):
    id: int
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserBackgroundUpdate(BaseModel):
    content: str
