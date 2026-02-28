# 一岗一历 · OneJD OneResume

一个支持多模型的智能求职 Agent：根据岗位 JD 生成定制简历，收藏面试指导，一岗一历、有条不紊。

## 功能特性

- **JD 管理** — 新建、编辑、删除岗位描述，支持状态与链接
- **简历定制** — AI Agent 根据 JD 和个人经历生成定制简历，多岗位多版本
- **面试指导** — 按岗位维护一份 Markdown 文档，支持改名/删除；选中对话内容右键「添加到面试指导」；与定制简历平级展示
- **对话式交互** — 自然语言对话优化简历，快捷提示（生成简历、面试辅导、优化润色等）
- **简历导出** — 导出前弹窗预览，可调字体大小、页边距，支持 PDF / Word，确定后选择保存位置
- **文件管理** — 岗位列表下展示该岗位的定制简历与面试指导，支持编辑、导出、删除
- **多模型支持** — 可切换 Claude / 通义千问 / 智谱 / DeepSeek / Kimi / 文心

---

## 界面布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          一岗一历 · 求职 Agent                               │
├──────────┬─────────────────────┬─────────────────────┬─────────────────────┤
│  侧边栏  │  岗位 JD 面板        │  简历内容面板        │  求职 Agent 对话     │
│          │  ─────────────────  │                     │                     │
│ ▸ 岗位A  │  # 高级前端工程师    │  # 张三              │  🤖 我是一岗一历，   │
│   📖面试指导  ## 岗位要求       │  ---                 │     你的求职助手     │
│   └简历1 │  - React 3年以上     │  ## 工作经历         │  👤 帮我生成简历     │
│   └简历2 │  [编辑]              │  字节跳动 2021-      │  🤖 好的，根据 JD…   │
│ ▸ 岗位B  │  ═══════════════     │  [编辑] [导出▾]     │  选中后右键→面试指导 │
│   📖面试指导  面试指导（可拖拽） │  [PDF预览]           │  _______________ ➤   │
│   └简历1 │  ## 摘录 · ...       │                     │                     │
│ [新建岗位]  │  [编辑] [清空]      │                     │                     │
│ ⚙ 模型   │                     │                     │                     │
└──────────┴─────────────────────┴─────────────────────┴─────────────────────┘
```

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / 浏览器                          │
│                                                                 │
│  ┌──────────┐  ┌──────────────────┐  ┌────────────┐  ┌───────┐  │
│  │ Sidebar  │  │ JD + 面试指导列   │  │Resume Panel│  │ Chat  │  │
│  │ 岗位/简历 │  │ JDPanel(上)       │  │  React     │  │ Panel │  │
│  │ 面试指导  │  │ 可拖拽分隔条      │  └─────┬──────┘  └───┬───┘  │
│  │ React    │  │ InterviewGuide(下)│        │              │      │
│  └────┬─────┘  └────────┬─────────┘         │              │      │
│       └─────────────────┴───────────────────┴──────────────┘      │
│                    React + TypeScript + Tailwind + Zustand        │
└──────────────────────────────┬──────────────────────────────────┘
                               │  REST API / SSE 流式
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                             │
│                                                                 │
│  /api/jobs ──► JobsRouter      ──► SQLAlchemy ORM              │
│  /api/resumes ► ResumesRouter  ──► SQLAlchemy ORM              │
│  /api/chat ──► ChatRouter      ──► providers.py                │
│  /api/export ► ExportRouter    ──► ReportLab PDF / python-docx  │
│  /api/settings► SettingsRouter ──► ai_settings.json            │
│                                                                 │
│                 providers.py (统一抽象层)                        │
│                 ┌──────────────────────────────────────────┐   │
│                 │  Anthropic SDK   │  OpenAI-compat SDK    │   │
│                 └──────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
              ┌────────────┴──────────────┐
              │                           │
              ▼                           ▼
┌─────────────────────┐     ┌─────────────────────────────────────┐
│   SQLite 数据库      │     │         AI 提供商                    │
│                     │     │                                     │
│  jobs               │     │  ☁ Anthropic  claude-opus-4-6      │
│  resumes            │     │  ☁ 阿里云     qwen-max / plus       │
│  conversations      │     │  ☁ 智谱       glm-4-plus / flash    │
│  (ai_settings.json) │     │  ☁ DeepSeek   deepseek-chat / r1    │
│                     │     │  ☁ Moonshot   kimi-128k             │
└─────────────────────┘     │  ☁ 百度       ernie-4.0            │
                            └─────────────────────────────────────┘
```

---

## 核心数据流

```
用户输入消息
     │
     ▼
ChatPanel.tsx
     │ POST /api/chat/stream
     │ { job_id, resume_id, messages[], user_background }
     ▼
ChatRouter (FastAPI)
     │ 从 DB 取 Job.content + Resume.content
     │ 拼接 System Prompt + JD上下文 + 简历上下文
     ▼
providers.stream_response()
     │ 读取 ai_settings.json → 确定 provider + model + api_key
     │
     ├─ provider=anthropic → AsyncAnthropic.messages.stream()
     └─ provider=其他     → AsyncOpenAI(base_url=...).chat.completions.create(stream=True)
     │
     ▼ Server-Sent Events (text/event-stream)
     │ data: {"type":"text","content":"..."}  ← 逐 token 推送
     │ data: {"type":"done"}
     ▼
ChatPanel.tsx (逐字渲染)
     │
     │ 检测 ===RESUME_START=== ... ===RESUME_END=== 标记
     │
     ├─ 无简历标记 → 仅展示对话内容
     └─ 有简历标记 → PUT /api/resumes/{id}  更新 DB
                         │
                         ▼
                   ResumePanel 实时刷新
```

---

## Agent Prompt 说明

System Prompt 存放于：

```
backend/routers/chat.py
└── SYSTEM_PROMPT  (第 13 行起)
```

每次对话时，后端动态将以下内容拼接后发送给模型：

```
[SYSTEM_PROMPT]          ← 角色定义、输出格式规范
---
## 目标岗位信息          ← 当前选中岗位的 content 字段
{job.content}
---
## 当前简历内容           ← 当前选中简历的 content（可为空）
{resume.content}
---
## 用户补充的个人经历     ← 前端「我的背景」输入框内容（可选）
{user_background}
```

---

## 技术栈

- **后端**: Python + FastAPI + SQLite (SQLAlchemy ORM)
- **前端**: React 18 + TypeScript + Tailwind CSS + Vite + Zustand
- **AI 多模型**: `anthropic` SDK + `openai` SDK (OpenAI-compat)
- **导出**: ReportLab (PDF)、python-docx (Word)，支持字体大小与页边距参数
- **面试指导**: 前端 localStorage 按岗位存储 Markdown 文档

---

## 支持的 AI 提供商

| 提供商 | 推荐模型 | 获取 Key |
|--------|----------|----------|
| Anthropic Claude | claude-opus-4-6 | console.anthropic.com |
| 通义千问 (Qwen) | qwen-plus / qwen-max | bailian.console.aliyun.com |
| 智谱 GLM | glm-4-flash (免费) / glm-4-plus | open.bigmodel.cn |
| DeepSeek | deepseek-chat / deepseek-reasoner | platform.deepseek.com |
| Moonshot (Kimi) | moonshot-v1-128k | platform.moonshot.cn |
| 百度文心 (ERNIE) | ernie-4.0-turbo-8k | console.bce.baidu.com |

---

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd backend && pip install -r requirements.txt

# 前端
cd frontend && npm install
```

### 2. 配置 API Key

**方式一：通过 UI 设置（推荐）**
启动后点击左下角模型名称，在弹窗中填写对应 API Key。

**方式二：环境变量**

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export DASHSCOPE_API_KEY=sk-...       # 通义千问
export ZHIPU_API_KEY=...              # 智谱
export DEEPSEEK_API_KEY=sk-...        # DeepSeek
export MOONSHOT_API_KEY=sk-...        # Kimi
export QIANFAN_API_KEY=...            # 百度文心
```

### 3. 启动

**重要：访问地址要和启动方式一致，否则会白屏。**

| 方式 | 命令 | 浏览器访问 |
|------|------|------------|
| 开发模式（前后端各一进程） | **`dev.bat`**（Windows 一键启动）或 `./dev.sh`（Linux/Mac）或 先 `cd backend && uvicorn main:app --port 8000`，再另开终端 `cd frontend && npm run dev` | **http://localhost:5173** |
| 生产模式（仅后端，顺带构建前端） | `./start.sh`（Linux/Mac）或 **`start.bat`**（Windows） | **http://localhost:8000** |

- **只启动了后端（uvicorn）时**：必须先生成前端再访问 8000。若未执行过 `npm run build`，请先运行 `start.bat` 或 `start.sh`（会先构建再起后端），然后访问 **http://localhost:8000**。
- **若打开的是 5173 却白屏**：说明前端开发服务器未启动，请在本机再开一个终端执行 `cd frontend && npm run dev`，再访问 **http://localhost:5173**。

---

## 使用方法

1. **新建岗位** — 点击左侧「新建岗位」，粘贴岗位 JD（支持上传图片/PDF/Word 解析）
2. **填写背景** — 对话面板点击「我的背景」，支持文本或文件上传，对话时自动带入
3. **生成简历** — 发送「帮我生成一份针对该 JD 的简历」，Agent 会更新右侧简历内容
4. **优化迭代** — 继续对话要求修改、润色或突出亮点
5. **面试辅导** — 发送「给我针对该岗位的面试技巧」等，在对话中选中文字右键「添加到面试指导中」可收藏到该岗位的面试指导
6. **面试指导** — 左侧每个岗位下可展开「面试指导」，支持改名、删除；中间栏 JD 下方有可拖拽高度的面试指导面板，编辑 Markdown 或从对话中摘录
7. **导出简历** — 简历面板「导出」→ 选择 Word 或 PDF → 在弹窗中预览并调整字体大小、页边距 → 确定后选择保存位置

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/jobs | 获取所有岗位 |
| POST | /api/jobs | 创建岗位 |
| PUT | /api/jobs/{id} | 更新岗位 |
| DELETE | /api/jobs/{id} | 删除岗位 |
| GET | /api/resumes | 获取简历列表 |
| POST | /api/resumes | 创建简历 |
| PUT | /api/resumes/{id} | 更新简历 |
| DELETE | /api/resumes/{id} | 删除简历 |
| POST | /api/chat/stream | SSE 流式对话 |
| GET | /api/chat/current-provider | 当前模型信息 |
| GET/POST | /api/chat/conversations | 获取/保存对话历史 |
| GET | /api/settings | 获取模型设置 |
| PUT | /api/settings | 保存模型设置 |
| DELETE | /api/settings/api-key/{provider} | 清除 API Key |
| GET | /api/export/pdf/{id} | 导出 PDF（可选 ?font_size=10&margin_cm=2） |
| GET | /api/export/pdf-preview/{id} | 内嵌预览 PDF（同上参数） |
| GET | /api/export/word/{id} | 导出 Word（可选 ?font_size=11&margin_cm=2） |
| GET | /api/background | 获取用户背景 |
| PUT | /api/background | 更新用户背景 |
| POST | /api/uploads/extract | 上传文件解析文本（OCR 等） |
| POST | /api/uploads/parse-job | 上传文件解析岗位信息 |
