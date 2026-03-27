from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    company = Column(String(255), nullable=True)
    job_url = Column(String(500), nullable=True)
    salary = Column(String(128), nullable=True)
    competency_profile = Column(String(80), nullable=True, default="default")
    content = Column(Text, nullable=False)
    status = Column(String(32), nullable=True, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    resumes = relationship("Resume", back_populates="job", cascade="all, delete-orphan")
    interview_questions = relationship(
        "JobInterviewQuestion",
        back_populates="job",
        cascade="all, delete-orphan",
    )


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    title = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    # 候选人归属：按“人物背景档案”区分同一候选人的多角度简历
    background_profile_id = Column(
        Integer,
        ForeignKey("user_backgrounds.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # 多角度简历标记：后端可在创建时自动分配（如 角度1/角度2）
    angle = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    job = relationship("Job", back_populates="resumes")
    conversations = relationship("Conversation", back_populates="resume", cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False)
    messages = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    resume = relationship("Resume", back_populates="conversations")


class JobConversation(Base):
    """按岗位保存的求职 Agent 对话记录（不依赖简历）。"""
    __tablename__ = "job_conversations"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True, unique=True)
    messages = Column(Text, nullable=False, default="[]")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    job = relationship("Job")


class EvaluationReport(Base):
    """结构化评估记录：能力项分值 + 证据链 + 置信度。"""
    __tablename__ = "evaluation_reports"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True, index=True)
    report_type = Column(String(50), nullable=False, default="scorecard")
    content_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class JobInterviewQuestion(Base):
    """按岗位扩展的模拟面试题库（LLM 根据 JD 生成，与全局 JSON 题库合并抽样）。"""
    __tablename__ = "job_interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    # 不同候选人的区分管理：同一岗位下，按“简历+人物背景”分别维护不同题库
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=True, index=True)
    background_profile_id = Column(
        Integer,
        ForeignKey("user_backgrounds.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    category = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("Job", back_populates="interview_questions")


class UserBackground(Base):
    __tablename__ = "user_backgrounds"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, default="默认")
    content = Column(Text, nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
