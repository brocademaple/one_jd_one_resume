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


class InterviewSimRequest(BaseModel):
    """与 ChatRequest 相同字段，用于独立面试模拟流式接口。"""
    resume_id: int
    job_id: int
    messages: List[MessageItem]
    user_background: Optional[str] = None
    # 本场抽样题单 Markdown，每轮请求一并传入以无状态推进
    questionnaire_markdown: Optional[str] = None


class QuestionnaireItemResponse(BaseModel):
    id: str
    category: str
    text: str


class QuestionnaireResponse(BaseModel):
    categories_used: List[str]
    items: List[QuestionnaireItemResponse]
    questionnaire_markdown: str


class InterviewReportRequest(BaseModel):
    job_id: int
    resume_id: int
    messages: List[MessageItem]
    user_background: Optional[str] = None


class InterviewReportResponse(BaseModel):
    report: str


class ConversationResponse(BaseModel):
    id: int
    resume_id: int
    messages: str
    created_at: datetime

    class Config:
        from_attributes = True


class BackgroundProfileResponse(BaseModel):
    id: int
    name: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BackgroundProfileCreate(BaseModel):
    name: str = "新档案"
    content: str = ""


class BackgroundProfileUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
