import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, RefreshCw, ChevronDown, ChevronRight, Settings, Sparkles, BookMarked, Clock3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Resume, CurrentProvider } from '../types';
import { streamChat, createResume, updateResume, fetchConversation, saveConversation, fetchJobConversation, saveJobConversation } from '../api';
import { addInterviewNote } from '../utils/interviewNotes';
import {
  findChatMessageContext,
  htmlSelectionToMarkdown,
  stripResumeMarkersFromAgentContent,
} from '../utils/selectionToMarkdown';
import { composeResumeTitleFromParts } from '../utils/resumeDefaultTitle';
import type { BackgroundProfilesController } from '../hooks/useBackgroundProfiles';
import { handleApiError, showInfo, showSuccess } from '../utils/errorHandler';

interface ChatPanelProps {
  jobId: number | null;
  /** 当前岗位标题，用于新建简历默认名称 */
  jobTitle?: string | null;
  /** 当前岗位公司名称，用于“公司分析”快捷按钮 */
  jobCompany?: string | null;
  resumeId: number | null;
  onResumeCreated: (resume: Resume) => void;
  onResumeUpdated: (resume: Resume) => void;
  onInterviewNoteAdded?: () => void;
  currentProvider?: CurrentProvider | null;
  onOpenSettings?: () => void;
  bg: BackgroundProfilesController;
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: '你好！我是**一岗一历**，你的求职助手。\n\n我可以帮你：\n- **生成简历**：根据岗位信息和你的背景，生成定制简历\n- **优化简历**：按你的要求修改、润色简历内容\n- **面试辅导**：预测面试题，给出回答框架\n- **简历诊断**：分析简历与 JD 的匹配度\n\n请点击页面右上角「我的背景」填写你的经历，然后告诉我你想做什么。',
  timestamp: Date.now(),
};

const QUICK_TIPS_EXPANDED_KEY = 'onejd-chat-quicktips-expanded';
const CHAT_ONBOARDING_DISMISSED_KEY = 'onejd-chat-onboarding-dismissed';

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

function readQuickTipsExpanded(): boolean {
  try {
    const v = localStorage.getItem(QUICK_TIPS_EXPANDED_KEY);
    if (v === null) return true;
    return v === '1';
  } catch {
    return true;
  }
}

export function ChatPanel({ jobId, jobTitle, jobCompany, resumeId, onResumeCreated, onResumeUpdated, onInterviewNoteAdded, onOpenSettings, bg }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [quickTipsExpanded, setQuickTipsExpanded] = useState(readQuickTipsExpanded);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const currentResumeIdRef = useRef<number | null>(resumeId);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDraft, setHistoryDraft] = useState<Message[]>([]);
  const [showOnboardingHint, setShowOnboardingHint] = useState(() => {
    try {
      return localStorage.getItem(CHAT_ONBOARDING_DISMISSED_KEY) !== '1';
    } catch {
      return true;
    }
  });

  useEffect(() => { currentResumeIdRef.current = resumeId; }, [resumeId]);
  useEffect(() => { if (autoScroll) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent, autoScroll]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = (e: MouseEvent) => {
      if (contextMenuRef.current?.contains(e.target as Node)) return;
      setContextMenu(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !jobId) return;
    const plain = sel.toString().trim();
    if (!plain) return;
    e.preventDefault();
    const range = sel.getRangeAt(0);
    const ctx = findChatMessageContext(range.commonAncestorContainer);
    /** Agent 气泡内选区：用 HTML→Markdown 保留标题、列表、加粗等；否则仍为纯文本 */
    let textForGuide = plain;
    if (ctx) {
      const md = htmlSelectionToMarkdown(range);
      if (md.length > 0) textForGuide = md;
    }
    setContextMenu({ x: e.clientX, y: e.clientY, text: textForGuide });
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setMessages([WELCOME_MESSAGE]);
      return;
    }
    // 以岗位为单位加载对话记录（不依赖简历）
    setLoadingHistory(true);
    const targetJobId = jobId;
    fetchJobConversation(jobId)
      .then(({ messages: saved }) => {
        if (jobId !== targetJobId) return;
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
      .catch(() => { if (jobId === targetJobId) setMessages([WELCOME_MESSAGE]); })
      .finally(() => { if (jobId === targetJobId) setLoadingHistory(false); });
  }, [jobId]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming || !jobId) return;
    const userText = input.trim();
    const userMessage: Message = { role: 'user', content: userText, timestamp: Date.now() };
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
        const askedResumeLike = /简历|resume|优化|润色|改写|更新/.test(userText.toLowerCase());
        if (resumeContent) {
          if (currentResumeIdRef.current) {
            onResumeUpdated(await updateResume(currentResumeIdRef.current, { content: resumeContent }));
          } else {
            const activeProfile = bg.activeProfileId != null
              ? bg.profiles.find((p) => p.id === bg.activeProfileId)
              : bg.profiles[0];
            const defaultTitle = composeResumeTitleFromParts(jobTitle, activeProfile?.name);
            const newResume = await createResume({
              job_id: jobId,
              content: resumeContent,
              title: defaultTitle,
              background_profile_id: bg.activeProfileId,
            });
            currentResumeIdRef.current = newResume.id;
            resumeIdToSave = newResume.id;
            onResumeCreated(newResume);
          }
        } else if (askedResumeLike) {
          showInfo('本轮回复未包含可落库的简历标记，暂未更新右侧简历。');
        }
        // 按岗位存储：把当前屏幕上的对话全量保存到该岗位下
        if (jobId) {
          saveJobConversation(jobId, finalMessages).catch((err) => handleApiError(err, '岗位对话自动保存失败'));
        }
        // 兼容旧逻辑：若有简历，也继续保存一份到 resume 对话（便于未来按简历回溯）
        if (resumeIdToSave && resumeIdToSave > 0) {
          saveConversation(resumeIdToSave, finalMessages).catch((err) => handleApiError(err, '简历对话备份失败'));
        }
      },
      err => {
        setStreaming(false);
        setStreamingContent('');
        setMessages(prev => [...prev, { role: 'assistant', content: `错误：${err.message}` }]);
      },
      bg.backgroundForChat || undefined,
    );
  }, [input, streaming, jobId, jobTitle, messages, bg.backgroundForChat, bg.profiles, bg.activeProfileId, onResumeCreated, onResumeUpdated]);

  const handleQuickPrompt = (text: string) => {
    setInput(text);
  };

  const buildCompanyAnalysisPrompt = (companyName: string) => {
    const safeCompany = (companyName || '').trim();
    return `请基于“公司名：${safeCompany}”做通用价值与风险分析，并结合当前岗位 JD 与我的简历内容，帮助我判断：
1) 这家公司对应该岗位：是否值得投入（给出理由与依据类型）
2) 我与该岗位的匹配度：我最可能匹配/不匹配的点是什么（基于我的经历与能力推断）
3) 风险点与信息缺口：哪些关键事实目前无法确认，需要在面试中验证
4) 最后给我一段面试可直接使用的表达总结（1-2段即可）

要求：
- 不要编造无法确认的具体事实；缺信息就明确“需要验证”
- 结构化分段输出，便于我直接拿去准备面试提问与陈述。`;
  };

  const handleClearChat = () => {
    setMessages([WELCOME_MESSAGE]);
    if (jobId) {
      saveJobConversation(jobId, [WELCOME_MESSAGE]).catch((err) => handleApiError(err, '清空后保存岗位历史失败'));
    }
    if (resumeId && resumeId > 0) {
      saveConversation(resumeId, [WELCOME_MESSAGE]).catch((err) => handleApiError(err, '清空后保存简历历史失败'));
    }
  };

  const toggleQuickTips = useCallback(() => {
    setQuickTipsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(QUICK_TIPS_EXPANDED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const dismissOnboardingHint = useCallback(() => {
    setShowOnboardingHint(false);
    try {
      localStorage.setItem(CHAT_ONBOARDING_DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!historyOpen) return;
    if (!jobId) return;
    setHistoryLoading(true);
    fetchJobConversation(jobId)
      .then(({ messages: saved }) => {
        const next = (saved && Array.isArray(saved) ? saved : []) as Message[];
        setHistoryDraft(next.length ? next : [WELCOME_MESSAGE]);
      })
      .catch(() => {
        setHistoryDraft([WELCOME_MESSAGE]);
      })
      .finally(() => setHistoryLoading(false));
  }, [historyOpen, jobId]);

  return <div className="flex flex-col h-full bg-gray-50">
    <div className="panel-header">
      <span className="panel-title flex-1 min-w-0"><Bot size={16} className="text-purple-500" /><span className="truncate">求职 Agent</span></span>
      <div className="flex items-center gap-1">
        <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" onClick={handleClearChat} title="清空对话"><RefreshCw size={14} /></button>
        <button
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
          onClick={() => setHistoryOpen(true)}
          disabled={!jobId || streaming}
          title="查看/编辑历史对话（按岗位）"
          aria-label="查看/编辑历史对话"
        >
          <Clock3 size={14} />
        </button>
        <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" onClick={onOpenSettings}><Settings size={14} /></button>
      </div>
    </div>

    {!jobId && <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700"><MessageSquare size={12} className="inline mr-1" />请先新建岗位</div>}
    {jobId && showOnboardingHint && (
      <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">首次使用提示</p>
          <p>可先点“公司分析”或“生成简历”快捷按钮；助手回复支持右键或书签收藏到面试指导。</p>
        </div>
        <button
          type="button"
          className="px-2 py-1 rounded-md text-[11px] border border-amber-300 hover:bg-amber-100"
          onClick={dismissOnboardingHint}
        >
          我知道了
        </button>
      </div>
    )}

    {loadingHistory && <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin" />加载对话历史...</div>}

    <div
      ref={chatContainerRef}
      className="flex-1 overflow-y-auto px-3 py-3 space-y-3 select-text"
      onScroll={() => {
        const c = chatContainerRef.current; if (!c) return; setAutoScroll(c.scrollHeight - c.scrollTop - c.clientHeight < 50);
      }}
      onContextMenu={handleContextMenu}
    >
      {messages.map((msg, i) => (
        <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${msg.role === 'user' ? 'bg-primary-600 text-white' : 'bg-purple-100 text-purple-600'}`}>{msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}</div>
          <div
            className={`relative max-w-[85%] flex-1 min-w-0 group/bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}
            data-chat-md-role={msg.role}
            data-chat-msg-index={i}
          >
            {msg.role === 'assistant' && jobId ? (
              <button
                type="button"
                className="absolute top-1.5 right-1.5 z-[1] p-1 rounded-md bg-white/95 border border-amber-200/90 text-amber-700 shadow-sm opacity-0 group-hover/bubble:opacity-100 hover:bg-amber-50 transition-opacity"
                title="将本回复以 Markdown 加入面试指导"
                onClick={(e) => {
                  e.stopPropagation();
                  const raw = stripResumeMarkersFromAgentContent(msg.content);
                  if (!raw) return;
                  addInterviewNote(jobId, raw);
                  onInterviewNoteAdded?.();
                }}
              >
                <BookMarked size={12} />
              </button>
            ) : null}
            {msg.role === 'assistant' ? (
              <div className="markdown-content text-sm pr-7">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content.replace(/===RESUME_START===[\s\S]*?===RESUME_END===/g, '*(简历已更新到右侧)*')}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
        </div>
      ))}
      {streaming && <div className="chat-bubble-assistant max-w-[85%]"><ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown></div>}
      <div ref={messagesEndRef} />
    </div>

    {contextMenu && (
      <div
        ref={contextMenuRef}
        className="fixed z-[100] min-w-[180px] py-1 bg-white rounded-lg border border-gray-200 shadow-lg"
        style={{ left: contextMenu.x, top: contextMenu.y }}
      >
        <button
          type="button"
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-800"
          onClick={() => {
            if (contextMenu.text.trim() && jobId) {
              addInterviewNote(jobId, contextMenu.text);
              onInterviewNoteAdded?.();
            }
            setContextMenu(null);
          }}
        >
          <BookMarked size={14} className="text-amber-500 flex-shrink-0" />
          添加到面试指导（尽量保留 Markdown）
        </button>
      </div>
    )}

    {historyOpen && jobId && (
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-history-title"
      >
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[88vh] overflow-hidden border border-gray-200 flex flex-col">
          <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-amber-50/50">
            <div className="min-w-0">
              <h3 id="job-history-title" className="text-sm font-semibold text-gray-900 truncate">
                岗位对话历史（按岗位保存）
              </h3>
              <p className="text-xs text-gray-500 truncate">可浏览/编辑并保存；保存会覆盖当前岗位历史</p>
            </div>
            <button
              type="button"
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              onClick={() => setHistoryOpen(false)}
              aria-label="关闭"
            >
              <ChevronDown size={18} className="rotate-[-90deg]" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 bg-gray-50">
            {historyLoading ? (
              <div className="flex items-center justify-center gap-2 text-gray-600 text-sm py-6">
                <Loader2 className="animate-spin" size={18} />
                加载历史中…
              </div>
            ) : (
              <div className="space-y-3">
                {historyDraft.map((m, idx) => (
                  <div key={idx} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                        m.role === 'user' ? 'bg-primary-600 text-white' : 'bg-purple-100 text-purple-600'
                      }`}
                    >
                      {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className={`relative w-full rounded-lg px-3 py-2 mb-2 border ${
                          m.role === 'user' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[11px] text-gray-600">
                            #{idx + 1} · {m.role === 'user' ? '候选人' : '面试官'}
                          </div>
                          <span className="text-[11px] text-gray-400">{m.role}</span>
                        </div>
                        <div className="markdown-content text-xs">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      </div>

                      <textarea
                        className="w-full min-h-[72px] border border-gray-200 rounded-lg text-xs p-2 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                        value={m.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHistoryDraft((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, content: val } : x)),
                          );
                        }}
                      />
                    </div>
                  </div>
                ))}
                {historyDraft.length === 0 && (
                  <p className="text-xs text-gray-500">暂无历史记录</p>
                )}
              </div>
            )}
          </div>

          <footer className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              className="px-3 py-2 rounded-lg text-xs bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={historyLoading || streaming}
              onClick={() => {
                if (!confirm('确定清空该岗位的历史对话？')) return;
                const next = [WELCOME_MESSAGE];
                setHistoryDraft(next);
                void saveJobConversation(jobId, next)
                  .then(() => {
                    setMessages(next);
                    showSuccess('已清空并保存该岗位历史');
                  })
                  .catch((err) => handleApiError(err, '清空历史失败'))
                  .finally(() => setHistoryOpen(false));
              }}
            >
              清空历史
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                className="px-3 py-2 rounded-lg text-xs border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setHistoryOpen(false)}
              >
                关闭
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-xs bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                disabled={historyLoading || streaming}
                onClick={() => {
                  void saveJobConversation(jobId, historyDraft)
                    .then(() => {
                      setMessages(historyDraft.length ? historyDraft : [WELCOME_MESSAGE]);
                      showSuccess('历史对话已保存');
                      setHistoryOpen(false);
                    })
                    .catch((err) => handleApiError(err, '保存历史失败'));
                }}
              >
                保存
              </button>
            </div>
          </footer>
        </div>
      </div>
    )}

    <div className="flex-shrink-0 border-t border-gray-200 bg-gray-100/90">
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 py-1.5 px-3 text-xs text-gray-600 hover:bg-gray-200/80 hover:text-gray-800 transition-colors"
        onClick={toggleQuickTips}
        aria-expanded={quickTipsExpanded}
        title={quickTipsExpanded ? '向下收起快捷区' : '展开快捷提示'}
      >
        {quickTipsExpanded ? (
          <ChevronDown size={15} className="text-gray-500 flex-shrink-0" aria-hidden />
        ) : (
          <ChevronRight size={15} className="text-gray-500 flex-shrink-0" aria-hidden />
        )}
        <Sparkles size={12} className="text-primary-600 flex-shrink-0 opacity-90" aria-hidden />
        <span>{quickTipsExpanded ? '收起快捷区' : '展开快捷提示'}</span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${quickTipsExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-3 pt-1 pb-2 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <BookMarked size={12} className="flex-shrink-0" />
              在助手消息中选中文本后右键，可按 Markdown 结构存入面试指导；或悬停助手气泡点击书签图标收藏整段
            </p>
            <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <Sparkles size={12} />
              快捷提示
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="text-xs px-2.5 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg border border-primary-100 transition-colors"
                onClick={() => {
                  if (!jobCompany) return;
                  handleQuickPrompt(buildCompanyAnalysisPrompt(jobCompany));
                }}
                disabled={!jobId || streaming || !jobCompany}
              >
                公司分析
              </button>
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
        </div>
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
          placeholder={
            jobId
              ? quickTipsExpanded
                ? '输入消息，或点击上方快捷提示...'
                : '输入消息，或点击「展开快捷提示」使用快捷按钮...'
              : '请先选择或新建岗位'
          }
        />
        <button className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center" onClick={handleSend} disabled={streaming || !input.trim() || !jobId}>{streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
      </div>
    </div>
  </div>;
}
