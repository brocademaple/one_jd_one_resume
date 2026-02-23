import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, RefreshCw, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Resume } from '../types';
import { streamChat, createResume, updateResume } from '../api';

interface ChatPanelProps {
  jobId: number | null;
  resumeId: number | null;
  onResumeCreated: (resume: Resume) => void;
  onResumeUpdated: (resume: Resume) => void;
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content: `你好！我是你的**简历定制助手**。

我可以帮助你：
- 📝 **定制简历** — 根据岗位JD，优化你的简历内容
- 💡 **面试辅导** — 提供针对岗位的面试技巧和常见问题解答
- ✨ **内容优化** — 突出你的优势，使用量化数据增强说服力

请先从左侧选择或创建一个岗位，然后告诉我你的个人背景和经历，我们就开始吧！`,
  timestamp: Date.now(),
};

function extractResumeFromText(text: string): string | null {
  const startMarker = '===RESUME_START===';
  const endMarker = '===RESUME_END===';
  const startIdx = text.indexOf(startMarker);
  const endIdx = text.indexOf(endMarker);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return text.slice(startIdx + startMarker.length, endIdx).trim();
  }
  return null;
}

export function ChatPanel({
  jobId,
  resumeId,
  onResumeCreated,
  onResumeUpdated,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [background, setBackground] = useState('');
  const [showBgInput, setShowBgInput] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentResumeIdRef = useRef<number | null>(resumeId);

  useEffect(() => {
    currentResumeIdRef.current = resumeId;
  }, [resumeId]);

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, autoScroll]);

  const handleScroll = () => {
    const container = chatContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming || !jobId) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setStreaming(true);
    setStreamingContent('');
    setAutoScroll(true);

    let fullContent = '';

    await streamChat(
      jobId,
      currentResumeIdRef.current || 0,
      nextMessages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
        role: m.role,
        content: m.content,
      })),
      (chunk) => {
        fullContent += chunk;
        setStreamingContent(fullContent);
      },
      async () => {
        setStreaming(false);
        setStreamingContent('');

        const assistantMessage: Message = {
          role: 'assistant',
          content: fullContent,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Check if response contains a resume
        const resumeContent = extractResumeFromText(fullContent);
        if (resumeContent && jobId) {
          try {
            if (currentResumeIdRef.current) {
              const updated = await updateResume(currentResumeIdRef.current, {
                content: resumeContent,
              });
              onResumeUpdated(updated);
            } else {
              const newResume = await createResume({
                job_id: jobId,
                content: resumeContent,
                title: '定制简历',
              });
              currentResumeIdRef.current = newResume.id;
              onResumeCreated(newResume);
            }
          } catch (err) {
            console.error('Failed to save resume:', err);
          }
        }
      },
      (err) => {
        setStreaming(false);
        setStreamingContent('');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `抱歉，发生了错误：${err.message}`,
          timestamp: Date.now(),
        }]);
      },
      background || undefined,
    );
  }, [input, streaming, jobId, messages, background, onResumeCreated, onResumeUpdated]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (confirm('确认清除所有对话记录？')) {
      setMessages([WELCOME_MESSAGE]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-title">
          <Bot size={16} className="text-purple-500" />
          简历定制 Agent
        </span>
        <div className="flex items-center gap-1">
          <button
            className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100"
            onClick={() => setShowBgInput(!showBgInput)}
            title="设置个人背景"
          >
            {showBgInput ? '收起背景' : '我的背景'}
          </button>
          <button
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={handleClear}
            title="清除对话"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Background input */}
      {showBgInput && (
        <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-200">
          <p className="text-xs text-yellow-700 mb-1 font-medium">你的个人背景（工作经历、技能等）</p>
          <textarea
            className="w-full text-xs border border-yellow-300 rounded px-2 py-1.5 bg-white resize-none focus:outline-none focus:ring-1 focus:ring-yellow-400"
            rows={3}
            placeholder="粘贴你的个人经历、技能、项目等背景信息，Agent会据此定制简历..."
            value={background}
            onChange={e => setBackground(e.target.value)}
          />
        </div>
      )}

      {/* No job selected warning */}
      {!jobId && (
        <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
          <p className="text-xs text-blue-700">
            <MessageSquare size={12} className="inline mr-1" />
            请先从左侧选择或创建一个岗位，再开始对话
          </p>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
        onScroll={handleScroll}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
              msg.role === 'user'
                ? 'bg-primary-600 text-white'
                : 'bg-purple-100 text-purple-600'
            }`}>
              {msg.role === 'user'
                ? <User size={14} />
                : <Bot size={14} />
              }
            </div>

            {/* Bubble */}
            <div className={`max-w-[85%] ${
              msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="markdown-content text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content
                      .replace(/===RESUME_START===[\s\S]*?===RESUME_END===/g, '*(简历内容已更新到右侧面板)*')
                    }
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streaming && (
          <div className="flex gap-2 flex-row">
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 bg-purple-100 text-purple-600">
              <Bot size={14} />
            </div>
            <div className="chat-bubble-assistant max-w-[85%]">
              {streamingContent ? (
                <div className="markdown-content text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingContent
                      .replace(/===RESUME_START===[\s\S]*?===RESUME_END===/g, '*(正在生成简历...)*')
                    }
                  </ReactMarkdown>
                  <span className="typing-cursor" />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">思考中...</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <div className="flex justify-center pb-1">
          <button
            className="flex items-center gap-1 text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm hover:bg-gray-50"
            onClick={scrollToBottom}
          >
            <ChevronDown size={12} />
            回到底部
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 bg-white border-t border-gray-200">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px] max-h-32"
            placeholder={jobId ? "输入消息... (Enter发送, Shift+Enter换行)" : "请先选择岗位"}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
            }}
            onKeyDown={handleKeyDown}
            disabled={streaming || !jobId}
            rows={1}
          />
          <button
            className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            onClick={handleSend}
            disabled={streaming || !input.trim() || !jobId}
          >
            {streaming
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            '帮我生成一份针对该JD的简历',
            '提供面试技巧和常见问题',
            '优化简历的工作经历描述',
            '如何突出我的技能亮点',
          ].map(prompt => (
            <button
              key={prompt}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-600 rounded-full transition-colors"
              onClick={() => setInput(prompt)}
              disabled={streaming || !jobId}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
