import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, RefreshCw, ChevronDown, Settings, Upload, X, Sparkles, Save, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Resume, CurrentProvider } from '../types';
import { streamChat, createResume, updateResume, extractTextFromFile, fetchConversation, saveConversation, fetchUserBackground, updateUserBackground } from '../api';

interface ChatPanelProps {
  jobId: number | null;
  resumeId: number | null;
  onResumeCreated: (resume: Resume) => void;
  onResumeUpdated: (resume: Resume) => void;
  currentProvider?: CurrentProvider | null;
  onOpenSettings?: () => void;
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: '你好！我是你的**求职助手**。\n\n我可以帮你：\n- **生成简历**：根据岗位信息和你的背景，生成定制简历\n- **优化简历**：按你的要求修改、润色简历内容\n- **面试辅导**：预测面试题、给出回答框架\n- **简历诊断**：分析简历与 JD 的匹配度\n\n请先点击「我的背景」填写你的经历，然后告诉我你想做什么。',
  timestamp: Date.now(),
};

const QUICK_PROMPTS = [
  { label: '生成简历', text: '请根据当前岗位信息和我的背景，帮我生成一份定制简历。' },
  { label: '面试辅导', text: '请针对这个岗位，给我 5-8 个高概率面试题及回答框架。' },
  { label: '优化润色', text: '请帮我优化当前简历的表达，使其更专业、更有说服力。' },
  { label: '简历诊断', text: '请诊断当前简历与岗位信息的匹配度，指出不足并给出改进建议。' },
  { label: '突出亮点', text: '请根据岗位要求，帮我突出简历中的核心亮点和量化成果。' },
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
  const [savingBackground, setSavingBackground] = useState(false);
  const [backgroundSaved, setBackgroundSaved] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentResumeIdRef = useRef<number | null>(resumeId);

  useEffect(() => { currentResumeIdRef.current = resumeId; }, [resumeId]);
  useEffect(() => { if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent, autoScroll]);

  // 加载用户背景信息
  useEffect(() => {
    fetchUserBackground()
      .then(bg => setBackground(bg.content))
      .catch(() => setBackground(''));
  }, []);

  // 切换 job/resume 时加载历史对话
  useEffect(() => {
    if (!jobId) {
      setMessages([WELCOME_MESSAGE]);
      return;
    }
    if (resumeId && resumeId > 0) {
      setLoadingHistory(true);
      const targetResumeId = resumeId;
      fetchConversation(resumeId)
        .then(({ messages: saved }) => {
          if (currentResumeIdRef.current !== targetResumeId) return;
          if (saved && saved.length > 0) {
            setMessages(saved.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: Date.now(),
            })));
          } else {
            setMessages([WELCOME_MESSAGE]);
          }
        })
        .catch(() => { if (currentResumeIdRef.current === targetResumeId) setMessages([WELCOME_MESSAGE]); })
        .finally(() => { if (currentResumeIdRef.current === targetResumeId) setLoadingHistory(false); });
    } else {
      setMessages([WELCOME_MESSAGE]);
    }
  }, [jobId, resumeId]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming || !jobId) return;
    const userMessage: Message = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setStreaming(true);
    setStreamingContent('');
    let fullContent = '';

    await streamChat(
      jobId,
      currentResumeIdRef.current || 0,
      nextMessages.map(m => ({ role: m.role, content: m.content })),
      chunk => { fullContent += chunk; setStreamingContent(fullContent); },
      async () => {
        setStreaming(false);
        setStreamingContent('');
        const assistantMsg: Message = { role: 'assistant', content: fullContent, timestamp: Date.now() };
        const finalMessages = [...nextMessages, assistantMsg];
        setMessages(finalMessages);

        const resumeContent = extractResumeFromText(fullContent);
        let resumeIdToSave = currentResumeIdRef.current;
        if (resumeContent) {
          if (currentResumeIdRef.current) {
            onResumeUpdated(await updateResume(currentResumeIdRef.current, { content: resumeContent }));
          } else {
            const newResume = await createResume({ job_id: jobId, content: resumeContent, title: '定制简历' });
            currentResumeIdRef.current = newResume.id;
            resumeIdToSave = newResume.id;
            onResumeCreated(newResume);
          }
        }
        if (resumeIdToSave && resumeIdToSave > 0) {
          saveConversation(resumeIdToSave, finalMessages).catch(() => {});
        }
      },
      err => {
        setStreaming(false);
        setStreamingContent('');
        setMessages(prev => [...prev, { role: 'assistant', content: `错误：${err.message}` }]);
      },
      background || undefined,
    );
  }, [input, streaming, jobId, messages, background, onResumeCreated, onResumeUpdated]);

  const handleQuickPrompt = (text: string) => {
    setInput(text);
  };

  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    if (resumeId && resumeId > 0) {
      saveConversation(resumeId, [WELCOME_MESSAGE]).catch(() => {});
    }
  };

  return <div className="flex flex-col h-full bg-gray-50">
    <div className="panel-header">
      <span className="panel-title flex-1 min-w-0"><Bot size={16} className="text-purple-500" /><span className="truncate">求职 Agent</span></span>
      <div className="flex items-center gap-1">
        <button className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100" onClick={() => setShowBgModal(true)}>我的背景</button>
        <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" onClick={handleClearChat} title="清空对话"><RefreshCw size={14} /></button>
        <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" onClick={onOpenSettings}><Settings size={14} /></button>
      </div>
    </div>

    {!jobId && <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700"><MessageSquare size={12} className="inline mr-1" />请先新建岗位</div>}

    {loadingHistory && <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin" />加载对话历史...</div>}

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
      <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1"><Sparkles size={12} />快捷提示</p>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p.label}
            className="text-xs px-2.5 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg border border-primary-100 transition-colors"
            onClick={() => handleQuickPrompt(p.text)}
            disabled={!jobId || streaming}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>

    {!autoScroll && <div className="flex justify-center pb-1"><button className="text-xs" onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setAutoScroll(true); }}><ChevronDown size={12} className="inline" />回到底部</button></div>}

    <div className="px-3 py-3 bg-white border-t border-gray-200">
      <div className="flex gap-2 items-end">
        <textarea
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          disabled={streaming || !jobId}
          placeholder={jobId ? '输入消息，或点击上方快捷提示...' : '请先选择或新建岗位'}
        />
        <button className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center" onClick={handleSend} disabled={streaming || !input.trim() || !jobId}>{streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
      </div>
    </div>

    {showBgModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[760px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-lg font-semibold">我的背景（全面信息汇总）</h2><button className="p-1 hover:bg-gray-100 rounded" onClick={() => setShowBgModal(false)} title="关闭"><X size={18} /></button></div>
        <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
          <p className="text-xs text-gray-500">包含：基本信息、学历、实习、项目、个人作品集等。支持文本直接编辑，或上传PDF/Word/图片自动OCR。</p>
          <label className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded border cursor-pointer hover:bg-gray-50"><Upload size={13} />上传背景文件
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={async e => {
              const file = e.target.files?.[0]; if (!file) return; setUploadingBg(true);
              try { const res = await extractTextFromFile(file); setBackground(prev => `${prev}\n\n${res.text}`.trim()); } catch { alert('背景文件解析失败，请检查OCR配置。'); } finally { setUploadingBg(false); }
            }} />
          </label>
          {uploadingBg && <p className="text-xs text-gray-500"><Loader2 size={12} className="inline animate-spin mr-1" />解析中...</p>}
          <textarea className="w-full min-h-[380px] border rounded-lg px-3 py-2 text-sm" value={background} onChange={e => { setBackground(e.target.value); setBackgroundSaved(false); }} placeholder="在此维护完整个人背景信息..." />
        </div>
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3 bg-gray-50 rounded-b-xl">
          <span className="text-sm text-gray-500">{backgroundSaved ? <span className="inline-flex items-center gap-1 text-green-600"><Check size={14} /> 已保存到数据库</span> : '点击保存后，内容将写入数据库，对话时会自动带入。'}</span>
          <div className="flex items-center gap-2">
            <button
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
              onClick={() => setShowBgModal(false)}
            >
              关闭
            </button>
            <button
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              disabled={savingBackground}
              onClick={async () => {
                setSavingBackground(true);
                setBackgroundSaved(false);
                try {
                  await updateUserBackground(background);
                  setBackgroundSaved(true);
                  setTimeout(() => setBackgroundSaved(false), 3000);
                } catch {
                  alert('保存失败，请重试');
                } finally {
                  setSavingBackground(false);
                }
              }}
            >
              {savingBackground ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savingBackground ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}
