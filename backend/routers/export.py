import io
import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

from database import get_db
import models

router = APIRouter(prefix="/api/export", tags=["export"])


def md_to_pdf_content(md_text: str):
    """Convert markdown text to reportlab flowables."""

    font_path_bold = None
    font_path_regular = None
    font_candidates = [
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    for fp in font_candidates:
        if os.path.exists(fp):
            font_path_regular = fp
            font_path_bold = fp
            break

    if font_path_regular:
        try:
            pdfmetrics.registerFont(TTFont("ChineseFont", font_path_regular))
            base_font = "ChineseFont"
        except Exception:
            base_font = "Helvetica"
    else:
        base_font = "Helvetica"

    styles = getSampleStyleSheet()

    style_h1 = ParagraphStyle(
        "H1",
        fontName=base_font,
        fontSize=18,
        spaceAfter=6,
        spaceBefore=10,
        textColor=colors.HexColor("#1a1a2e"),
        leading=22,
    )
    style_h2 = ParagraphStyle(
        "H2",
        fontName=base_font,
        fontSize=13,
        spaceAfter=4,
        spaceBefore=8,
        textColor=colors.HexColor("#16213e"),
        leading=17,
        borderPadding=(0, 0, 2, 0),
    )
    style_h3 = ParagraphStyle(
        "H3",
        fontName=base_font,
        fontSize=11,
        spaceAfter=3,
        spaceBefore=5,
        textColor=colors.HexColor("#0f3460"),
        leading=14,
    )
    style_body = ParagraphStyle(
        "Body",
        fontName=base_font,
        fontSize=10,
        spaceAfter=2,
        spaceBefore=1,
        leading=14,
        textColor=colors.HexColor("#333333"),
    )
    style_bullet = ParagraphStyle(
        "Bullet",
        fontName=base_font,
        fontSize=10,
        spaceAfter=2,
        spaceBefore=1,
        leading=14,
        leftIndent=15,
        textColor=colors.HexColor("#333333"),
    )

    story = []
    lines = md_text.split("\n")

    for line in lines:
        line = line.rstrip()

        stripped = re.sub(r"\*\*(.*?)\*\*", r"\1", line)
        stripped = re.sub(r"\*(.*?)\*", r"\1", stripped)
        stripped = re.sub(r"`(.*?)`", r"\1", stripped)

        if line.startswith("# "):
            text = stripped[2:].strip()
            if text:
                story.append(Paragraph(text, style_h1))
        elif line.startswith("## "):
            text = stripped[3:].strip()
            if text:
                story.append(Spacer(1, 0.1 * cm))
                story.append(Paragraph(text, style_h2))
                story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cccccc")))
        elif line.startswith("### "):
            text = stripped[4:].strip()
            if text:
                story.append(Paragraph(text, style_h3))
        elif line.startswith("- ") or line.startswith("* "):
            text = "• " + stripped[2:].strip()
            if text.strip() != "•":
                story.append(Paragraph(text, style_bullet))
        elif line.startswith("===RESUME_START===") or line.startswith("===RESUME_END==="):
            continue
        elif line.strip() == "---" or line.strip() == "***":
            story.append(HRFlowable(width="100%", thickness=0.3, color=colors.HexColor("#dddddd")))
        elif line.strip() == "":
            story.append(Spacer(1, 0.2 * cm))
        else:
            if stripped.strip():
                story.append(Paragraph(stripped, style_body))

    return story


@router.get("/pdf/{resume_id}")
def export_pdf(resume_id: int, db: Session = Depends(get_db)):
    db_resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    content = db_resume.content
    content = re.sub(r"===RESUME_START===\n?", "", content)
    content = re.sub(r"===RESUME_END===\n?", "", content)

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    story = md_to_pdf_content(content)
    doc.build(story)

    buffer.seek(0)

    filename = f"resume_{resume_id}.pdf"
    if db_resume.title:
        safe_title = re.sub(r"[^\w\s-]", "", db_resume.title).strip()[:50]
        if safe_title:
            filename = f"{safe_title}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.get("/markdown/{resume_id}")
def export_markdown(resume_id: int, db: Session = Depends(get_db)):
    db_resume = db.query(models.Resume).filter(models.Resume.id == resume_id).first()
    if not db_resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    content = db_resume.content
    content = re.sub(r"===RESUME_START===\n?", "", content)
    content = re.sub(r"===RESUME_END===\n?", "", content)

    filename = f"resume_{resume_id}.md"
    if db_resume.title:
        safe_title = re.sub(r"[^\w\s-]", "", db_resume.title).strip()[:50]
        if safe_title:
            filename = f"{safe_title}.md"

    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
