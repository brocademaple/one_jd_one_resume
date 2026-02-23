import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, RefreshCw, ChevronDown, Settings, Upload, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Resume, CurrentProvider } from '../types';
import { streamChat, createResume, updateResume, extractTextFromFile } from '../api';

interface ChatPanelProps {
  jobId: number | null;
  resumeId: number | null;
  onResumeCreated: (resume: Resume) => void;
  onResumeUpdated: (resume: Resume) => void;
  currentProvider?: CurrentProvider | null;
  onOpenSettings?: () => void;
}

const WELCOME_MESSAGE: Message = { role: 'assistant', content: '你好！我是你的**求职助手**，可基于岗位JD和你的完整背景进行简历定制。', timestamp: Date.now() };

const SYSTEM_EXAMPLES = [
  {
    role: 'AI产品经理',
    jd: '负责AI Agent产品规划、需求拆解、评估模型效果，推动研发落地。需要LLM应用经验、数据分析与跨团队协作能力。',
    resume: '# 候选人A\n\n## 职业摘要\n3年AI产品经验，负责Copilot与企业知识库检索产品。\n\n## 项目\n- 主导智能问答系统上线，满意度提升22%。',
    history: '用户：我想投AI产品经理。\n助手：已提炼你在需求拆解、评估指标与跨团队推进的优势。',
  },
  {
    role: 'Agent开发工程师',
    jd: '负责多Agent框架搭建、工具调用编排、RAG与工作流优化。要求Python/TypeScript、LangGraph/AutoGen经验。',
    resume: '# 候选人B\n\n## 职业摘要\n4年后端+AI工程经验，熟悉Agent工具链与RAG。\n\n## 项目\n- 搭建多Agent客服系统，工单自动化率提升35%。',
    history: '用户：我希望突出Agent工程能力。\n助手：已根据岗位强调工具编排、评测与稳定性优化成果。',
  },
];

function extractResumeFromText(text: string): string | null {
  const startIdx = text.indexOf('===RESUME_START===');
  const endIdx = text.indexOf('===RESUME_END===');
  return startIdx !== -1 && endIdx > startIdx ? text.slice(startIdx + 18, endIdx).trim() : null;
}

export function ChatPanel({ jobId, resumeId, onResumeCreated, onResumeUpdated, currentProvider, onOpenSettings }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [background, setBackground] = useState('');
  const [showBgModal, setShowBgModal] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentResumeIdRef = useRef<number | null>(resumeId);

  useEffect(() => { currentResumeIdRef.current = resumeId; }, [resumeId]);
  useEffect(() => { if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent, autoScroll]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming || !jobId) return;
    const userMessage: Message = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages); setInput(''); setStreaming(true); setStreamingContent('');
    let fullContent = '';

    await streamChat(jobId, currentResumeIdRef.current || 0, nextMessages.map(m => ({ role: m.role, content: m.content })),
      chunk => { fullContent += chunk; setStreamingContent(fullContent); },
      async () => {
        setStreaming(false); setStreamingContent('');
        setMessages(prev => [...prev, { role: 'assistant', content: fullContent, timestamp: Date.now() }]);
        const resumeContent = extractResumeFromText(fullContent);
        if (resumeContent) {
          if (currentResumeIdRef.current) onResumeUpdated(await updateResume(currentResumeIdRef.current, { content: resumeContent }));
          else { const newResume = await createResume({ job_id: jobId, content: resumeContent, title: '定制简历' }); currentResumeIdRef.current = newResume.id; onResumeCreated(newResume); }
        }
      },
      err => { setStreaming(false); setStreamingContent(''); setMessages(prev => [...prev, { role: 'assistant', content: `错误：${err.message}` }]); },
      background || undefined,
    );
  }, [input, streaming, jobId, messages, background, onResumeCreated, onResumeUpdated]);

  const loadSystemExample = (idx: number) => {
    const ex = SYSTEM_EXAMPLES[idx];
    setInput(`请参考系统示例：${ex.role}，帮我生成同风格简历`);
    setBackground(`【系统示例】岗位：${ex.role}\nJD：${ex.jd}\n简历：\n${ex.resume}\n模拟对话历史：\n${ex.history}`);
    setShowBgModal(true);
  };

  return <div className="flex flex-col h-full bg-gray-50">
    <div className="panel-header">
      <span className="panel-title flex-1 min-w-0"><Bot size={16} className="text-purple-500" /><span className="truncate">求职 Agent</span></span>
      <div className="flex items-center gap-1">
        <button className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100" onClick={() => setShowBgModal(true)}>我的背景</button>
        <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" onClick={() => setMessages([WELCOME_MESSAGE])}><RefreshCw size={14} /></button>
        <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" onClick={onOpenSettings}><Settings size={14} /></button>
      </div>
    </div>

    {!jobId && <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700"><MessageSquare size={12} className="inline mr-1" />请先新建岗位</div>}

    <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3" onScroll={() => {
      const c = chatContainerRef.current; if (!c) return; setAutoScroll(c.scrollHeight - c.scrollTop - c.clientHeight < 50);
    }}>
      {messages.map((msg, i) => <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-purple-100 text-purple-600'}`}>{msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}</div>
        <div className={`max-w-[85%] ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>{msg.role === 'assistant' ? <div className="markdown-content text-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content.replace(/===RESUME_START===[\s\S]*?===RESUME_END===/g, '*(简历已更新到右侧)*')}</ReactMarkdown></div> : <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}</div>
      </div>)}
      {streaming && <div className="chat-bubble-assistant max-w-[85%]"><ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown></div>}
      <div ref={messagesEndRef} />
    </div>

    <div className="px-3 pb-2">
      <p className="text-xs text-purple-600 mb-1">系统示例</p>
      <div className="flex flex-wrap gap-1.5">{SYSTEM_EXAMPLES.map((ex, idx) => <button key={ex.role} className="text-xs px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full" onClick={() => loadSystemExample(idx)}>系统示例：{ex.role}</button>)}</div>
    </div>

    {!autoScroll && <div className="flex justify-center pb-1"><button className="text-xs" onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setAutoScroll(true); }}><ChevronDown size={12} className="inline" />回到底部</button></div>}

    <div className="px-3 py-3 bg-white border-t border-gray-200">
      <div className="flex gap-2 items-end">
        <textarea className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none" rows={1} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} disabled={streaming || !jobId} />
        <button className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center" onClick={handleSend} disabled={streaming || !input.trim() || !jobId}>{streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
      </div>
    </div>

    {showBgModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[760px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-lg font-semibold">我的背景（全面信息汇总）</h2><button onClick={() => setShowBgModal(false)}><X size={18} /></button></div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto">
          <p className="text-xs text-gray-500">包含：基本信息、学历、实习、项目、个人作品集等。支持文本直接编辑，或上传PDF/Word/图片自动OCR。</p>
          <label className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded border cursor-pointer hover:bg-gray-50"><Upload size={13} />上传背景文件
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return; setUploadingBg(true);
              try { const res = await extractTextFromFile(file); setBackground(prev => `${prev}\n\n${res.text}`.trim()); } catch { alert('背景文件解析失败，请检查OCR配置。'); } finally { setUploadingBg(false); }
            }} />
          </label>
          {uploadingBg && <p className="text-xs text-gray-500"><Loader2 size={12} className="inline animate-spin mr-1" />解析中...</p>}
          <textarea className="w-full min-h-[380px] border rounded-lg px-3 py-2 text-sm" value={background} onChange={e => setBackground(e.target.value)} placeholder="在此维护完整个人背景信息..." />
        </div>
      </div>
    </div>}
  </div>;
}
