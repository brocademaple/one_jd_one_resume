import io
import re
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from resume_background_parser import parse_resume_pdf_to_background

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


class TextExtractResponse(BaseModel):
    filename: str
    text: str
    parser: str


class ParseResumeBackgroundResponse(BaseModel):
    filename: str
    text: str
    parser: str
    warning: Optional[str] = None


class JobParseResponse(BaseModel):
    title: str
    company: Optional[str] = None
    content: str
    source: str


def _extract_from_pdf(content: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(content))
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts).strip()


def _extract_from_docx(content: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs if p.text).strip()


def _ocr_from_image(content: bytes) -> str:
    from PIL import Image
    import pytesseract

    image = Image.open(io.BytesIO(content))
    return pytesseract.image_to_string(image, lang="chi_sim+eng").strip()


def _extract_from_plain_text(content: bytes) -> str:
    """纯文本 / Markdown：按 BOM → UTF-8 → 国标中文编码依次尝试解码。"""
    if not content:
        return ""
    for encoding in ("utf-8-sig", "utf-8", "gb18030", "gbk"):
        try:
            return content.decode(encoding).strip()
        except UnicodeDecodeError:
            continue
    return content.decode("utf-8", errors="replace").strip()


def extract_text_from_file(filename: str, content: bytes):
    lower = filename.lower()
    if lower.endswith((".txt", ".md", ".markdown")):
        return _extract_from_plain_text(content), "text_plain"
    if lower.endswith(".pdf"):
        return _extract_from_pdf(content), "pdf"
    if lower.endswith(".doc") or lower.endswith(".docx"):
        return _extract_from_docx(content), "word"
    if lower.endswith((".png", ".jpg", ".jpeg", ".bmp", ".webp")):
        return _ocr_from_image(content), "ocr"
    raise HTTPException(status_code=400, detail="仅支持 PDF/Word/图片/纯文本(.txt、.md) 文件")


def _parse_job_fields(text: str) -> JobParseResponse:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    title = ""
    company = None

    for line in lines[:8]:
        if not title and any(k in line for k in ["工程师", "经理", "专家", "负责人", "Developer", "Manager"]):
            title = re.sub(r"^(职位|岗位)[:：]\s*", "", line)
            continue
        if not company and any(k in line for k in ["公司", "企业", "Company"]):
            company = re.sub(r"^(公司|企业|Company)[:：]\s*", "", line)

    if not title and lines:
        title = lines[0][:80]

    return JobParseResponse(
        title=title or "未识别岗位名称",
        company=company,
        content=text.strip(),
        source="auto_parse",
    )


@router.post("/parse-resume-background", response_model=ParseResumeBackgroundResponse)
async def parse_resume_background(file: UploadFile = File(...)):
    """
    简历 PDF → 候选人背景 Markdown（通义：文本整理或 VL 读图）。
    需在设置中配置通义千问 API Key。
    """
    name = (file.filename or "").lower()
    if not name.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="仅支持 PDF 简历文件")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="上传文件为空")

    text, parser, warning = parse_resume_pdf_to_background(content)
    return ParseResumeBackgroundResponse(
        filename=file.filename or "resume.pdf",
        text=text,
        parser=parser,
        warning=warning,
    )


@router.post("/extract", response_model=TextExtractResponse)
async def extract_text(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="上传文件为空")
    try:
        text, parser = extract_text_from_file(file.filename or "", content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"文件解析失败: {exc}") from exc

    if not text:
        raise HTTPException(status_code=400, detail="未提取到文本，请检查文件清晰度")

    return TextExtractResponse(filename=file.filename or "", text=text, parser=parser)


@router.post("/parse-job", response_model=JobParseResponse)
async def parse_job(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="上传文件为空")
    try:
        text, _ = extract_text_from_file(file.filename or "", content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"JD解析失败: {exc}") from exc
    if not text:
        raise HTTPException(status_code=400, detail="未提取到JD文本")
    return _parse_job_fields(text)
