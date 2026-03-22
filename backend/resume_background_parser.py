"""
简历 PDF →「我的背景」用 Markdown：pypdf 抽字 + 通义文本模型整理；
文本过少时 PyMuPDF 渲染页面 + 通义 VL 多模态识别。
"""
import base64
import io
from typing import Optional, Tuple

from fastapi import HTTPException

from providers import load_settings, get_api_key
from qwen_client import qwen_chat_completion

# 可调参数
MAX_PDF_BYTES = 10 * 1024 * 1024  # 10MB
MIN_TEXT_CHARS_FOR_LLM = 200  # 少于此认为需走 VL（扫描件等）
MAX_VL_PAGES = 5
QWEN_TEXT_MODEL = "qwen-long"  # 长简历；可改为 qwen-plus
QWEN_VL_MODEL = "qwen-vl-plus"  # 多模态；DashScope 兼容模式可替换为 qwen2.5-vl 系列

# 与产品约定的「纯文本 + 段落分层」展示格式（emoji 大节 + 字段行 + • 列表）
BACKGROUND_FORMAT_SPEC = """输出格式要求（必须严格遵守）：
1）使用纯文本，不要用 # 号标题；用大节标题行分段，格式为：emoji + 空格 + 标题（单独一行）。
2）推荐大节（无内容可整节省略）：📋 基本信息、🎓 学历、💼 实习经历、🚀 项目经历、🎨 个人作品集、⚡ 核心技能、💬 自我评价。
3）节与节之间空一行；节内字段用「字段名：」后接内容，可在一行内用「|」分隔多项（如联系方式）。
4）列表项以「•」开头，独占一行；经历块可先写「公司 | 岗位  时间段」再换行列点。
5）保留量化数据、时间、产品名等事实，不要编造。"""

SYSTEM_STRUCTURE = f"""你是简历整理助手。用户将提供从 PDF 抽取的原始文本，可能顺序混乱或有缺行。
请将内容整理为「候选人背景信息」正文，便于在对话区以纯文本分段展示。

{BACKGROUND_FORMAT_SPEC}

只输出整理后的正文，不要前言、后记或代码块包裹。"""

USER_TEXT_TEMPLATE = """以下是从简历 PDF 抽取的原始文本，请按上述格式整理：\n\n---\n\n{raw}\n\n---"""

SYSTEM_VL = f"""你是简历识别助手。用户会提供简历页面截图，请识别全部可见文字与结构，输出「候选人背景信息」正文。

{BACKGROUND_FORMAT_SPEC}

信息不足处如实简略，不要编造。只输出正文。"""


def _pypdf_extract(pdf_bytes: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(pdf_bytes))
    parts = []
    for page in reader.pages:
        parts.append(page.extract_text() or "")
    return "\n".join(parts).strip()


def _pdf_pages_png_base64(pdf_bytes: bytes, max_pages: int) -> list:
    import fitz  # PyMuPDF

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        n = min(len(doc), max_pages)
        out = []
        for i in range(n):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x 缩放提高清晰度
            png_bytes = pix.tobytes("png")
            out.append(base64.b64encode(png_bytes).decode("ascii"))
        return out
    finally:
        doc.close()


def _messages_text_path(raw_text: str) -> list:
    return [
        {"role": "system", "content": SYSTEM_STRUCTURE},
        {"role": "user", "content": USER_TEXT_TEMPLATE.format(raw=raw_text[:120000])},
    ]


def _messages_vl_path(images_b64: list) -> list:
    parts = []
    for b64 in images_b64:
        parts.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{b64}"},
            }
        )
    parts.append(
        {
            "type": "text",
            "text": "请根据以上简历页面图片，按系统说明中的「纯文本 + emoji 大节」格式输出候选人背景信息正文。",
        }
    )
    return [{"role": "system", "content": SYSTEM_VL}, {"role": "user", "content": parts}]


def parse_resume_pdf_to_background(pdf_bytes: bytes) -> Tuple[str, str, Optional[str]]:
    """
    返回 (整理后的 Markdown 正文, parser 标记, 可选 warning)。
    需要通义 API Key；未配置则抛 HTTPException。
    """
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(status_code=400, detail=f"PDF 文件过大，请小于 {MAX_PDF_BYTES // (1024 * 1024)}MB")

    settings = load_settings()
    api_key = get_api_key("qwen", settings)
    if not api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="未配置通义千问 API Key：请在「模型设置」中填写通义千问 Key，或使用环境变量 DASHSCOPE_API_KEY",
        )

    raw = _pypdf_extract(pdf_bytes)
    warning: Optional[str] = None

    if len(raw) >= MIN_TEXT_CHARS_FOR_LLM:
        messages = _messages_text_path(raw)
        try:
            out = qwen_chat_completion(api_key, QWEN_TEXT_MODEL, messages, max_tokens=8192, timeout=180.0)
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"通义模型整理简历失败: {str(e)[:300]}") from e
        if not out.strip():
            raise HTTPException(status_code=502, detail="通义模型返回空内容，请重试或更换模型")
        return out, "pypdf+qwen_text", warning

    # 文本过少：多模态读图
    try:
        images_b64 = _pdf_pages_png_base64(pdf_bytes, MAX_VL_PAGES)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF 转图失败: {str(e)[:200]}") from e

    if not images_b64:
        raise HTTPException(status_code=400, detail="PDF 无可用页面")

    messages = _messages_vl_path(images_b64)
    try:
        out = qwen_chat_completion(api_key, QWEN_VL_MODEL, messages, max_tokens=8192, timeout=180.0)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"通义多模态识别简历失败: {str(e)[:300]}") from e

    if not out.strip():
        raise HTTPException(status_code=502, detail="通义多模态返回空内容，请检查 PDF 是否清晰")

    if raw.strip():
        warning = "已从扫描类 PDF 中识别内容；若与预期不符，可改用文本型简历 PDF 重试。"

    return out, "pymupdf+qwen_vl", warning
