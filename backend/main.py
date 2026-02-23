from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from database import engine, Base
from routers import jobs, resumes, chat, export, settings as settings_router, uploads

Base.metadata.create_all(bind=engine)

app = FastAPI(title="求职Agent", version="1.0.0")

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
app.include_router(export.router)
app.include_router(settings_router.router)
app.include_router(uploads.router)

static_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index_path = os.path.join(static_dir, "index.html")
        return FileResponse(index_path)
else:
    @app.get("/")
    def root():
        return {"message": "简历定制Agent API is running"}


@app.get("/api/health")
def health():
    return {"status": "ok"}
