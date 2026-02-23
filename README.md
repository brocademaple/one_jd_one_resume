# 简历定制 Agent

一个基于 Claude AI 的智能简历定制系统，帮助用户根据岗位 JD 生成专业的定制简历。

## 功能特性

- **JD 管理** — 新建、编辑、删除岗位描述
- **简历定制** — AI Agent 根据 JD 和个人经历生成定制简历
- **对话式交互** — 通过自然语言对话不断优化简历
- **面试辅导** — 提供针对性的面试技巧和常见问题解答
- **简历导出** — 支持 PDF 和 Markdown 格式导出
- **文件管理** — 管理多个岗位对应的多版本简历

## 界面布局

```
┌─────────┬──────────────┬──────────────┬──────────────────┐
│  侧边栏  │   岗位 JD    │   简历内容   │   Agent 对话     │
│         │              │              │                  │
│ JD列表  │  查看/编辑   │  查看/编辑   │  与AI对话定制    │
│ 简历列表 │  岗位描述    │  简历内容    │  简历和面试辅导  │
└─────────┴──────────────┴──────────────┴──────────────────┘
```

## 技术栈

- **后端**: Python + FastAPI + SQLite + Anthropic SDK
- **前端**: React + TypeScript + Tailwind CSS + Vite
- **AI**: Claude Opus 4.6 (自适应思考模式)

## 快速开始

### 1. 设置 API Key

```bash
export ANTHROPIC_API_KEY=your_api_key_here
```

### 2. 启动服务

**生产模式**（先构建前端，再启动服务）:
```bash
chmod +x start.sh
./start.sh
```

**开发模式**（前后端分别热重载）:
```bash
chmod +x dev.sh
./dev.sh
```

### 3. 访问应用

- 生产模式: http://localhost:8000
- 开发模式: http://localhost:5173

## 手动启动

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 前端

```bash
cd frontend
npm install
npm run dev      # 开发模式
# 或
npm run build    # 构建生产版本
```

## 使用方法

1. **新建岗位** — 点击左侧「新建岗位」按钮，粘贴岗位 JD
2. **填写背景** — 在对话面板点击「我的背景」，填入个人经历
3. **开始对话** — 告诉 Agent 你的需求，例如「帮我生成一份针对该 JD 的简历」
4. **优化简历** — 继续对话，让 Agent 优化简历内容
5. **面试准备** — 询问面试技巧和常见问题
6. **导出简历** — 点击简历面板的「导出」按钮，下载 PDF 或 Markdown

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
| POST | /api/chat/stream | 流式对话 |
| GET | /api/export/pdf/{id} | 导出 PDF |
| GET | /api/export/markdown/{id} | 导出 Markdown |
