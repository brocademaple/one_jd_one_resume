from pathlib import Path
import os
from dotenv import load_dotenv

# 加载 backend/.env 中的环境变量（API Key 等）
load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import engine, Base
from routers import jobs, resumes, chat, export, settings as settings_router, uploads, background, interview_sim

Base.metadata.create_all(bind=engine)

# 迁移：为 jobs 表添加缺失列
try:
    from sqlalchemy import text
    with engine.begin() as conn:
        result = conn.execute(text("PRAGMA table_info(jobs)"))
        cols = [r[1] for r in result]
        if "status" not in cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN status VARCHAR(32) DEFAULT 'pending'"))
        if "job_url" not in cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN job_url VARCHAR(500)"))
        if "salary" not in cols:
            conn.execute(text("ALTER TABLE jobs ADD COLUMN salary VARCHAR(128)"))
        # user_backgrounds：多人背景档案显示名
        result_bg = conn.execute(text("PRAGMA table_info(user_backgrounds)"))
        bg_cols = [r[1] for r in result_bg]
        if "name" not in bg_cols:
            conn.execute(text("ALTER TABLE user_backgrounds ADD COLUMN name VARCHAR(200) DEFAULT '默认'"))
            conn.execute(text("UPDATE user_backgrounds SET name = '默认' WHERE name IS NULL OR name = ''"))
        # 岗位专属面试题库（按“简历+人物背景”分别维护）
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS job_interview_questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id INTEGER NOT NULL,
                    resume_id INTEGER,
                    background_profile_id INTEGER,
                    category VARCHAR(100) NOT NULL,
                    text TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
                )
                """
            )
        )
        result_q = conn.execute(text("PRAGMA table_info(job_interview_questions)"))
        q_cols = [r[1] for r in result_q]
        if "resume_id" not in q_cols:
            conn.execute(text("ALTER TABLE job_interview_questions ADD COLUMN resume_id INTEGER"))
        if "background_profile_id" not in q_cols:
            conn.execute(text("ALTER TABLE job_interview_questions ADD COLUMN background_profile_id INTEGER"))

        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_job_interview_questions_job_id ON job_interview_questions (job_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_job_interview_questions_resume_id ON job_interview_questions (resume_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_job_interview_questions_background_profile_id ON job_interview_questions (background_profile_id)"))
except Exception:
    pass

app = FastAPI(title="一岗一历 · OneJD OneResume", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(resumes.router)
app.include_router(chat.router)
app.include_router(interview_sim.router)
app.include_router(export.router)
app.include_router(settings_router.router)
app.include_router(uploads.router)
app.include_router(background.router)

static_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "api":
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")
        index_path = os.path.join(static_dir, "index.html")
        return FileResponse(index_path)
else:
    @app.get("/")
    def root():
        return {"message": "简历定制Agent API is running"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
