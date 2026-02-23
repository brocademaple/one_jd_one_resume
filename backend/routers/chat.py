import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from providers import stream_response, load_settings, PROVIDERS

router = APIRouter(prefix="/api/chat", tags=["chat"])

SYSTEM_PROMPT = """# 角色定义

你是一位拥有 10 年以上经验的资深职业规划师和简历顾问，曾服务于 BAT、字节、美团、华为等头部企业的 HR 及猎头团队。你深刻理解招聘方的筛选逻辑，擅长将候选人的真实经历转化为最能打动面试官的表达方式。

---

# 能力模块

## 1. 简历诊断
收到用户简历后，先主动进行诊断，指出：
- 与 JD 匹配度评分（0-100分）及差距分析
- 关键词覆盖率：JD 中的核心技能/要求是否在简历中体现
- 亮点不足或表述模糊的经历
- 建议补充的量化数据（如：负责了 → 主导了，提升性能 → 性能提升 40%）

## 2. 简历定制生成
根据岗位 JD 和用户经历，生成一份「为该岗位量身定制」的简历：
- **关键词对齐**：将 JD 中的高频词、技术栈、软技能自然融入
- **STAR 法则**：工作经历用「背景-任务-行动-结果」结构描述，结果尽量量化
- **倒序排列**：最近最相关的经历放在最前
- **职业摘要**：3-4 句话浓缩核心竞争力，与 JD 要求高度呼应
- **技能排序**：JD 最重视的技能排在最前，过时/无关技能可省略

## 3. 面试辅导
提供针对该岗位的面试准备建议：
- 预测 5-8 个高概率考察题目（技术/行为/情景）
- 给出每道题的回答框架和示例答案
- 指出候选人经历中可能被深挖的薄弱点及应对策略
- 行为面试题用 STAR 法则示范回答

## 4. 简历迭代
接收用户的修改要求后，精准调整对应段落，不改动其他内容，并说明修改了哪些地方及原因。

---

# 简历输出规范

**何时输出简历**：用户明确要求生成、修改或更新简历时。

**必须遵守的标记协议**：
输出完整简历时，必须在简历内容的首尾各加一行标记，格式严格如下：

```
===RESUME_START===
[完整的 Markdown 格式简历内容]
===RESUME_END===
```

标记之外可以有正常的对话说明文字（如解释修改思路），但简历正文必须被完整包裹在两个标记之间。

**简历 Markdown 结构模板**：

```markdown
# 姓名

📧 邮箱 | 📱 手机 | 🔗 GitHub/Portfolio | 📍 城市

---

## 职业摘要

[3-4句话，突出核心竞争力，与JD高度呼应]

---

## 工作经历

### 公司名称 | 职位名称 | 起止时间

**项目/职责方向**

- [背景] 负责...
- [行动] 通过...手段，主导/实现了...
- [结果] 最终使...提升X%/降低X%/完成...

### 公司名称 | 职位名称 | 起止时间

...

---

## 教育背景

### 学校名称 | 专业 | 学历 | 毕业年份

- GPA / 荣誉 / 相关课程（可选）

---

## 专业技能

- **[JD最重视的技能类别]**：具体技术/工具列表
- **[第二重要类别]**：...
- **语言**：中文（母语）、英文（CET-6/流利）

---

## 项目经历（可选）

### 项目名称 | 角色 | 时间

- 技术栈：...
- 核心贡献：...
- 成果：...
```

---

# 行为准则

1. **不捏造信息**：只根据用户提供的真实经历进行润色和优化，不虚构项目或数据
2. **主动追问**：若用户经历信息不足（如缺少量化数据、项目细节），主动询问而非自行填充
3. **简洁有力**：简历语言避免口语化，动词开头（主导、负责、设计、优化、推动）
4. **中文优先**：除非岗位明确要求英文简历，否则输出中文
5. **聚焦当前JD**：每次生成均以当前系统上下文中的 JD 为核心参照"""


async def _generate(
    job_content: str,
    resume_content: str,
    messages: list,
    user_background: str = None,
):
    context_parts = [f"## 目标岗位JD\n\n{job_content}"]
    if resume_content:
        context_parts.append(f"## 当前简历内容\n\n{resume_content}")
    if user_background:
        context_parts.append(f"## 用户补充的个人经历\n\n{user_background}")

    context = "\n\n---\n\n".join(context_parts)
    system_with_context = f"{SYSTEM_PROMPT}\n\n---\n\n{context}"

    api_messages = [{"role": m["role"], "content": m["content"]} for m in messages]

    async for text in stream_response(system_with_context, api_messages):
        yield f"data: {json.dumps({'type': 'text', 'content': text})}\n\n"

    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@router.post("/stream")
async def chat_stream(request: schemas.ChatRequest, db: Session = Depends(get_db)):
    db_job = db.query(models.Job).filter(models.Job.id == request.job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job not found")

    db_resume = db.query(models.Resume).filter(models.Resume.id == request.resume_id).first()
    resume_content = db_resume.content if db_resume else ""

    messages = [msg.model_dump() for msg in request.messages]

    return StreamingResponse(
        _generate(
            job_content=db_job.content,
            resume_content=resume_content,
            messages=messages,
            user_background=request.user_background,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/current-provider")
def get_current_provider():
    """Return the currently configured provider and model info for the UI."""
    settings = load_settings()
    provider_id = settings.get("provider", "anthropic")
    model_id = settings.get("model", "")
    pconfig = PROVIDERS.get(provider_id, {})
    model_name = next(
        (m["name"] for m in pconfig.get("models", []) if m["id"] == model_id),
        model_id,
    )
    return {
        "provider": provider_id,
        "provider_name": pconfig.get("name_cn", provider_id),
        "model": model_id,
        "model_name": model_name,
    }


@router.get("/conversations/{resume_id}", response_model=schemas.ConversationResponse)
def get_conversation(resume_id: int, db: Session = Depends(get_db)):
    db_conv = (
        db.query(models.Conversation)
        .filter(models.Conversation.resume_id == resume_id)
        .first()
    )
    if not db_conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return db_conv


@router.post("/conversations")
def save_conversation(resume_id: int, messages: list, db: Session = Depends(get_db)):
    db_conv = (
        db.query(models.Conversation)
        .filter(models.Conversation.resume_id == resume_id)
        .first()
    )
    if db_conv:
        db_conv.messages = json.dumps(messages, ensure_ascii=False)
    else:
        db_conv = models.Conversation(
            resume_id=resume_id,
            messages=json.dumps(messages, ensure_ascii=False),
        )
        db.add(db_conv)
    db.commit()
    return {"message": "Conversation saved"}
