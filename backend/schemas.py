from pydantic import BaseModel
from typing import Dict, Optional, List
from datetime import datetime


JOB_STATUS = ["pending", "screening", "screening_fail", "interviewing", "interview_fail", "offered"]


class JobBase(BaseModel):
    title: str
    company: Optional[str] = None
    job_url: Optional[str] = None
    salary: Optional[str] = None
    competency_profile: Optional[str] = "default"
    content: str
    status: Optional[str] = "pending"


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    job_url: Optional[str] = None
    salary: Optional[str] = None
    competency_profile: Optional[str] = None
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
    background_profile_id: Optional[int] = None
    angle: Optional[str] = None


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    background_profile_id: Optional[int] = None
    angle: Optional[str] = None


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


class JobInterviewBankMetaResponse(BaseModel):
    """当前岗位已保存的专属面试题数量。"""
    count: int


class GenerateInterviewBankRequest(BaseModel):
    job_id: int
    resume_id: int
    background_profile_id: int
    # True：生成前清空该岗位已有专属题；False：在原有基础上追加
    replace: bool = False


class GenerateInterviewBankResponse(BaseModel):
    added: int
    total_for_job: int


class QuestionCategoriesResponse(BaseModel):
    categories: List[str]


class PresetBankStats(BaseModel):
    total: int
    by_category: Dict[str, int]


class JobQuestionPreviewRow(BaseModel):
    id: int
    category: str
    text: str


class BankPreviewResponse(BaseModel):
    """管理员/预览：预置题库统计 + 当前岗位专属题列表。"""
    categories_allowed: List[str]
    preset: PresetBankStats
    job_questions: List[JobQuestionPreviewRow]


class JobBankDeleteResponse(BaseModel):
    deleted: int

class JobQuestionUpdateRequest(BaseModel):
    job_id: int
    resume_id: int
    background_profile_id: int
    question_id: int
    text: str


class JobQuestionUpdateResponse(BaseModel):
    updated: int


class JobQuestionDeleteRequest(BaseModel):
    job_id: int
    resume_id: int
    background_profile_id: int
    question_id: int


class JobQuestionDeleteResponse(BaseModel):
    deleted: int


class EvidenceRef(BaseModel):
    source: str
    quote: str
    why: Optional[str] = None


class ScoreCardItem(BaseModel):
    competency: str
    score: int
    confidence: str
    summary: str
    evidence: List[EvidenceRef]
    gap: Optional[str] = None
    suggestion: Optional[str] = None


class EvaluationScorecardRequest(BaseModel):
    job_id: int
    resume_id: int
    transcript: Optional[str] = None
    user_background: Optional[str] = None


class EvaluationScorecardResponse(BaseModel):
    overall_score: int
    overall_summary: str
    items: List[ScoreCardItem]
    needs_verification: List[str]


class EvaluationReportListItem(BaseModel):
    id: int
    job_id: int
    resume_id: Optional[int] = None
    report_type: str
    content_json: str
    created_at: datetime

    class Config:
        from_attributes = True


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


class JobConversationSave(BaseModel):
    job_id: int
    messages: List[dict]


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
