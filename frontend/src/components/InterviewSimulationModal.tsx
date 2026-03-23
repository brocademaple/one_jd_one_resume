import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, Send, Loader2, ClipboardCheck, ArrowLeft, Square, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';
import {
  streamInterviewSim,
  fetchInterviewReport,
  fetchInterviewQuestionnaire,
  type QuestionnaireItem,
} from '../api';
import { parseInterviewSimReply, interviewSimMessageForReport } from '../utils/parseInterviewSimReply';
import { handleApiError } from '../utils/errorHandler';
import { useWebSpeechDictation } from '../hooks/useWebSpeechDictation';

type SimMsg = { role: 'user' | 'assistant'; content: string };

const START_PROMPT =
  '请作为面试官开始本场模拟面试：严格按约定格式输出（先 <<<REACTION>>> 再 <<<SPEECH>>>）。开场简短自然，然后从 **本场题单第 1 条** 切入，结合 JD 与简历口语发问（不必一字不差复述题干）。';

interface InterviewSimulationModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  resumeId: number;
  resumeTitle: string | null;
  userBackground?: string;
}

function toApiMessages(msgs: SimMsg[]): Message[] {
  return msgs.map((m) => ({ role: m.role, content: m.content }));
}

function toReportMessages(msgs: SimMsg[]): Message[] {
  return msgs.map((m) => {
    if (m.role === 'user') return { role: 'user', content: m.content };
    const { reaction, speech } = parseInterviewSimReply(m.content);
    return {
      role: 'assistant',
      content: interviewSimMessageForReport('assistant', m.content, reaction, speech),
    };
  });
}

export function InterviewSimulationModal({
  open,
  onClose,
  jobId,
  jobTitle,
  resumeId,
  resumeTitle,
  userBackground,
}: InterviewSimulationModalProps) {
  const [phase, setPhase] = useState<'interview' | 'report'>('interview');
  const [messages, setMessages] = useState<SimMsg[]>([]);
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [reportMd, setReportMd] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [questionnaireItems, setQuestionnaireItems] = useState<QuestionnaireItem[]>([]);
  const [questionnaireLoading, setQuestionnaireLoading] = useState(false);
  const [questionListOpen, setQuestionListOpen] = useState(true);
  const questionnaireMdRef = useRef('');
  const listEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef('');
  inputRef.current = input;

  const {
    speechSupported,
    listening,
    speechError,
    setSpeechError,
    toggleListening,
    stopListening,
  } = useWebSpeechDictation({
    getText: () => inputRef.current,
    setText: setInput,
    disabled: streaming || reportLoading,
  });

  useEffect(() => {
    if (!open) stopListening();
  }, [open, stopListening]);

  useEffect(() => {
    if (!open) return;
    setPhase('interview');
    setMessages([]);
    setStarted(false);
    setInput('');
    setStreaming(false);
    setStreamingContent('');
    setReportMd('');
    setReportLoading(false);
    setQuestionnaireItems([]);
    setQuestionnaireLoading(false);
    setQuestionListOpen(true);
    questionnaireMdRef.current = '';
  }, [open, jobId, resumeId]);

  useEffect(() => {
    if (open) listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, open, phase]);

  const runAssistantTurn = useCallback(
    (history: SimMsg[]) => {
      return new Promise<void>((resolve, reject) => {
        const apiMsgs = toApiMessages(history);
        setStreaming(true);
        setStreamingContent('');
        let full = '';
        void streamInterviewSim(
          jobId,
          resumeId,
          apiMsgs,
          (chunk) => {
            full += chunk;
            setStreamingContent(full);
          },
          () => {
            setStreaming(false);
            setStreamingContent('');
            setMessages((prev) => [...prev, { role: 'assistant', content: full }]);
            resolve();
          },
          (err) => {
            setStreaming(false);
            setStreamingContent('');
            handleApiError(err, '面试官回复失败');
            reject(err);
          },
          userBackground,
          questionnaireMdRef.current || null,
        );
      });
    },
    [jobId, resumeId, userBackground],
  );

  const handleStart = async () => {
    if (streaming || questionnaireLoading) return;
    setQuestionnaireLoading(true);
    try {
      const seed = Math.floor(Math.random() * 1_000_000_000);
      const data = await fetchInterviewQuestionnaire({ jobId, total: 7, seed });
      questionnaireMdRef.current = data.questionnaire_markdown;
      setQuestionnaireItems(data.items);
    } catch (e) {
      handleApiError(e, '拉取本场题单失败');
      setQuestionnaireLoading(false);
      return;
    }
    setQuestionnaireLoading(false);

    const first: SimMsg[] = [{ role: 'user', content: START_PROMPT }];
    setMessages(first);
    setStarted(true);
    try {
      await runAssistantTurn(first);
    } catch {
      setStarted(false);
      setMessages([]);
      setQuestionnaireItems([]);
      questionnaireMdRef.current = '';
    }
  };

  const handleSend = async () => {
    const t = input.trim();
    if (!t || streaming || !started) return;
    const userMsg: SimMsg = { role: 'user', content: t };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    try {
      await runAssistantTurn(next);
    } catch {
      setMessages((curr) =>
        curr.length && curr[curr.length - 1]?.role === 'user' ? curr.slice(0, -1) : curr,
      );
    }
  };

  const handleEndAndReport = async () => {
    if (streaming || reportLoading || messages.length === 0) return;
    if (!confirm('确定结束本场模拟面试并生成复盘报告？')) return;
    setReportLoading(true);
    try {
      const { report } = await fetchInterviewReport({
        jobId,
        resumeId,
        messages: toReportMessages(messages),
        userBackground,
      });
      setReportMd(report);
      setPhase('report');
    } catch (e) {
      handleApiError(e, '生成报告失败');
    } finally {
      setReportLoading(false);
    }
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportMd);
    } catch {
      handleApiError(new Error('copy failed'), '复制失败');
    }
  };

  const handleBackToInterview = () => {
    setPhase('interview');
    setReportMd('');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-gray-900/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-sim-title"
    >
      <div className="flex flex-col flex-1 min-h-0 m-2 sm:m-4 md:mx-auto md:my-6 md:max-w-3xl md:w-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-amber-50/80">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Mic className="text-amber-600 flex-shrink-0" size={22} />
            <div className="min-w-0">
              <h2 id="interview-sim-title" className="text-base font-semibold text-gray-900 truncate">
                {phase === 'report' ? '面试复盘报告' : '模拟面试'}
              </h2>
              <p className="text-xs text-gray-500 truncate">
                {jobTitle}
                {resumeTitle ? ` · ${resumeTitle}` : ''}
              </p>
            </div>
          </div>
          {phase === 'interview' ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={!started || messages.length === 0 || streaming || reportLoading}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:pointer-events-none"
                onClick={() => void handleEndAndReport()}
              >
                {reportLoading ? <Loader2 className="animate-spin inline" size={14} /> : '结束并生成报告'}
              </button>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                title="关闭"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={handleBackToInterview}
              >
                <ArrowLeft size={14} className="inline mr-1" />
                返回对话
              </button>
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                onClick={handleCopyReport}
              >
                <ClipboardCheck size={14} className="inline mr-1" />
                复制报告
              </button>
              <button type="button" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          )}
        </header>

        {phase === 'report' ? (
          <div className="flex-1 overflow-y-auto min-h-0 p-4 markdown-content bg-white">
            {reportMd ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd}</ReactMarkdown>
            ) : (
              <p className="text-gray-500 text-sm">暂无报告</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4 bg-gray-50">
              {!started ? (
                <div className="text-center py-12 px-4">
                  <p className="text-gray-600 text-sm mb-4">
                    将基于当前岗位的 JD、选中简历与人物背景（若已填写）进行模拟。开始时会从<strong>预置分类题库</strong>中抽取本场题单，面试官按题单推进，减少重复出题成本。面试官会展示简短现场反应，结束后可生成复盘报告。
                    {speechSupported ? (
                      <span className="block mt-2 text-amber-800/90">
                        开始后可<strong>打字</strong>或点击输入框旁<strong>麦克风</strong>用语音作答（推荐 Chrome / Edge）。
                      </span>
                    ) : (
                      <span className="block mt-2 text-gray-500">语音输入需浏览器支持（如 Chrome / Edge）；也可全程手动输入。</span>
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={streaming || questionnaireLoading}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 min-w-[8rem]"
                    onClick={() => void handleStart()}
                  >
                    {questionnaireLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        抽取题单…
                      </>
                    ) : (
                      '开始面试'
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {questionnaireItems.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/90 text-sm overflow-hidden">
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2 text-left font-medium text-amber-950 hover:bg-amber-100/80"
                        onClick={() => setQuestionListOpen((o) => !o)}
                        aria-expanded={questionListOpen}
                      >
                        <ChevronDown
                          size={18}
                          className={`flex-shrink-0 text-amber-700 transition-transform ${questionListOpen ? '' : '-rotate-90'}`}
                        />
                        本场题单（{questionnaireItems.length} 题）
                      </button>
                      {questionListOpen && (
                        <ol className="list-decimal pl-9 pr-3 pb-3 space-y-1.5 text-gray-800 text-xs leading-relaxed">
                          {questionnaireItems.map((q) => (
                            <li key={q.id}>
                              <span className="text-amber-900/85 font-medium">【{q.category}】</span> {q.text}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                  {messages.map((m, i) =>
                    m.role === 'user' ? (
                      <div key={i} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl px-4 py-2 bg-primary-600 text-white text-sm whitespace-pre-wrap">
                          {m.content === START_PROMPT ? (
                            <span className="text-primary-100 italic">（已开始面试）</span>
                          ) : (
                            m.content
                          )}
                        </div>
                      </div>
                    ) : (
                      <AssistantBubble key={i} content={m.content} />
                    ),
                  )}
                  {streaming && (
                    <AssistantBubble content={streamingContent} streaming />
                  )}
                  <div ref={listEndRef} />
                </>
              )}
            </div>

            {started && (
              <footer className="flex-shrink-0 border-t border-gray-200 p-3 bg-white flex flex-col gap-2">
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 min-h-[44px] max-h-32 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-y outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-gray-50"
                    placeholder={
                      listening
                        ? '正在听写…说完可点红色按钮结束，或继续补充文字'
                        : '输入你的回答，或点击麦克风语音输入…'
                    }
                    rows={2}
                    value={input}
                    disabled={streaming || reportLoading || listening}
                    onChange={(e) => {
                      setSpeechError(null);
                      setInput(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  {speechSupported && (
                    <button
                      type="button"
                      disabled={streaming || reportLoading}
                      title={listening ? '结束听写' : '语音输入（中文）'}
                      aria-pressed={listening}
                      className={[
                        'self-end flex-shrink-0 w-11 h-11 rounded-lg flex items-center justify-center border transition-colors',
                        listening
                          ? 'bg-red-50 border-red-300 text-red-600 animate-pulse'
                          : 'bg-white border-gray-200 text-amber-700 hover:bg-amber-50',
                      ].join(' ')}
                      onClick={() => {
                        setSpeechError(null);
                        toggleListening();
                      }}
                    >
                      {listening ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={streaming || reportLoading || listening || !input.trim()}
                    className="self-end px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1"
                    onClick={() => void handleSend()}
                  >
                    {streaming ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </button>
                </div>
                {speechError && (
                  <p className="text-xs text-red-600 px-0.5" role="alert">
                    {speechError}
                  </p>
                )}
              </footer>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AssistantBubble({ content, streaming }: { content: string; streaming?: boolean }) {
  const { reaction, speech } = parseInterviewSimReply(content);
  const showSplit = reaction.length > 0 && speech.length > 0;

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl px-4 py-3 bg-white border border-amber-100 shadow-sm text-sm text-gray-800">
        {showSplit ? (
          <>
            <p className="text-xs text-amber-800/80 italic border-l-2 border-amber-300 pl-2 mb-2 whitespace-pre-wrap">
              现场：{reaction}
            </p>
            <div className="whitespace-pre-wrap">{speech}</div>
          </>
        ) : (
          <div className="whitespace-pre-wrap text-gray-700">
            {streaming && !content ? <Loader2 className="animate-spin text-amber-600" size={20} /> : content}
          </div>
        )}
      </div>
    </div>
  );
}
