import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Sparkles,
  RotateCcw,
  Eraser,
  Eye,
  Loader2,
  Mic,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react';

import {
  fetchQuestionCategories,
  fetchBankPreview,
  fetchJobInterviewBankMeta,
  generateInterviewBank,
  clearJobInterviewBank,
  updateJobInterviewQuestion,
  deleteJobInterviewQuestion,
  type BankPreviewApiResponse,
} from '../api';
import { handleApiError, showInfo, showSuccess } from '../utils/errorHandler';

interface InterviewQuestionBankModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  resumeId: number | null;
  backgroundProfileId: number | null;
  /** 只有选中该岗位的简历时才允许开始模拟 */
  canStartSimulation: boolean;
  onStartSimulation: (preferredCategories: string[] | null) => void;
}

export function InterviewQuestionBankModal({
  open,
  onClose,
  jobId,
  jobTitle,
  resumeId,
  backgroundProfileId,
  canStartSimulation,
  onStartSimulation,
}: InterviewQuestionBankModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const [jobBankCount, setJobBankCount] = useState(0);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<BankPreviewApiResponse | null>(null);
  const [editDraft, setEditDraft] = useState<Record<number, string>>({});
  const [editBusyId, setEditBusyId] = useState<number | null>(null);

  const [generatingBank, setGeneratingBank] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);

  const startDisabled = !canStartSimulation;

  const preferredCategories = useMemo(() => {
    if (selectedCategories.size === 0) return null; // 表示不过滤
    return Array.from(selectedCategories);
  }, [selectedCategories]);

  const loadMeta = async () => {
    if (!jobId) return;
    if (resumeId == null || backgroundProfileId == null) {
      setJobBankCount(0);
      return;
    }
    setLoadingMeta(true);
    try {
      const { count } = await fetchJobInterviewBankMeta({
        jobId,
        resumeId,
        backgroundProfileId,
      });
      setJobBankCount(count);
    } catch (e) {
      setJobBankCount(0);
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setGenerateError(null);
    setGeneratingBank(false);
    setPreviewOpen(false);
    setEditOpen(false);
    setPreviewLoading(false);
    setPreviewData(null);
    setEditDraft({});
    setSelectedCategories(new Set());
    void loadMeta();

    void fetchQuestionCategories()
      .then((r) => {
        setCategories(r.categories);
        setSelectedCategories(new Set(r.categories)); // 默认全选
      })
      .catch(() => {
        setCategories([]);
        setSelectedCategories(new Set());
      });
  }, [open, jobId, resumeId, backgroundProfileId]);

  const cancelGenerate = () => {
    generateAbortRef.current?.abort();
  };

  const loadPreview = async () => {
    if (!jobId) return;
    if (resumeId == null || backgroundProfileId == null) return;
    setPreviewLoading(true);
    try {
      const data = await fetchBankPreview({
        jobId,
        resumeId,
        backgroundProfileId,
      });
      setPreviewData(data);
      setEditDraft(
        Object.fromEntries(data.job_questions.map((q) => [q.id, q.text])) as Record<number, string>,
      );
    } catch (e) {
      handleApiError(e, '加载题库预览失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleToggleCategory = (c: string) => {
    setSelectedCategories((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  };

  const handleSelectAll = () => setSelectedCategories(new Set(categories));
  const handleClearSelection = () => setSelectedCategories(new Set());

  const handleGenerateAppend = async () => {
    if (generatingBank) return;
    if (resumeId == null || backgroundProfileId == null) return;
    generateAbortRef.current?.abort();
    generateAbortRef.current = new AbortController();
    setGenerateError(null);
    setGeneratingBank(true);
    try {
      const r = await generateInterviewBank({
        jobId,
        replace: false,
        resumeId,
        backgroundProfileId,
      }, generateAbortRef.current.signal);
      setJobBankCount(r.total_for_job);
      showSuccess(`已追加 ${r.added} 道专属题（共 ${r.total_for_job} 道）`);
      if (previewOpen || editOpen) {
        await loadPreview();
      }
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === 'AbortError') ||
        (e instanceof Error && e.name === 'AbortError');
      if (aborted) showInfo('已取消生成');
      else {
        setGenerateError('生成失败');
        handleApiError(e, '题库生成失败');
      }
    } finally {
      setGeneratingBank(false);
      generateAbortRef.current = null;
    }
  };

  const handleGenerateReplace = async () => {
    if (generatingBank) return;
    if (resumeId == null || backgroundProfileId == null) return;
    if (jobBankCount > 0) {
      if (!confirm(`将删除当前 ${jobBankCount} 道专属题并重新生成，确定？`)) return;
    }
    generateAbortRef.current?.abort();
    generateAbortRef.current = new AbortController();
    setGenerateError(null);
    setGeneratingBank(true);
    try {
      const r = await generateInterviewBank({
        jobId,
        replace: true,
        resumeId,
        backgroundProfileId,
      }, generateAbortRef.current.signal);
      setJobBankCount(r.total_for_job);
      showSuccess(`已覆盖重生 ${r.added} 道专属题（共 ${r.total_for_job} 道）`);
      if (previewOpen || editOpen) {
        await loadPreview();
      }
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === 'AbortError') ||
        (e instanceof Error && e.name === 'AbortError');
      if (aborted) showInfo('已取消生成');
      else {
        setGenerateError('生成失败');
        handleApiError(e, '题库生成失败');
      }
    } finally {
      setGeneratingBank(false);
      generateAbortRef.current = null;
    }
  };

  const handleClearBank = async () => {
    if (generatingBank) return;
    if (resumeId == null || backgroundProfileId == null) return;
    if (jobBankCount === 0) return;
    if (!confirm(`确定清空本岗位全部 ${jobBankCount} 道专属题？不可恢复。`)) return;

    try {
      const r = await clearJobInterviewBank({
        jobId,
        resumeId,
        backgroundProfileId,
      });
      setJobBankCount(0);
      showSuccess(`已清空 ${r.deleted} 道题`);
      if (previewOpen || editOpen) {
        await loadPreview();
      }
    } catch (e) {
      handleApiError(e, '清空失败');
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-bank-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col">
        <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-amber-50/70">
          <div className="min-w-0">
            <h2 id="question-bank-modal-title" className="text-sm font-semibold text-gray-900 truncate">
              题库配置 · {jobTitle}
            </h2>
            <p className="text-xs text-gray-500 truncate">
              专属题库 {jobBankCount} 题 · 生成会与预置题合并抽样
            </p>
          </div>
          <button type="button" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-5 bg-gray-50">
          {/* 专属题库管理 */}
          <section className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 text-sm">专属题库（按岗位 JD 生成）</h3>
              {loadingMeta && <span className="text-xs text-gray-500">刷新中…</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={generatingBank || resumeId == null || backgroundProfileId == null}
                className="px-3 py-1.5 rounded-lg text-sm text-violet-700 hover:bg-violet-50 disabled:opacity-50 flex items-center gap-2 min-w-[140px] justify-center"
                onClick={() => void handleGenerateAppend()}
              >
                <Sparkles size={14} className="opacity-80" />
                追加生成
              </button>
              <button
                type="button"
                disabled={generatingBank || resumeId == null || backgroundProfileId == null}
                className="px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2 min-w-[140px] justify-center"
                onClick={() => {
                  setPreviewOpen(true);
                  setEditOpen(false);
                  void loadPreview();
                }}
              >
                <Eye size={14} className="opacity-80" />
                查看题库
              </button>
              <button
                type="button"
                disabled={generatingBank || resumeId == null || backgroundProfileId == null}
                className="px-3 py-1.5 rounded-lg text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-2 min-w-[140px] justify-center"
                onClick={() => {
                  setEditOpen(true);
                  setPreviewOpen(false);
                  void loadPreview();
                }}
              >
                <CircleDashed size={14} className="opacity-80" />
                编辑题库
              </button>
            </div>
            {generateError && <p className="text-xs text-red-600 mt-2">{generateError}</p>}
          </section>

          {/* 预览 */}
          {previewOpen && (
            <section className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 text-sm">题库预览</h3>
                <button
                  type="button"
                  className="text-xs text-gray-600 hover:underline"
                  onClick={() => setPreviewOpen(false)}
                >
                  收起
                </button>
              </div>
              {previewLoading && (
                <div className="flex items-center gap-2 text-gray-600 text-sm py-6">
                  <Loader2 className="animate-spin" size={18} />
                  加载中…
                </div>
              )}
              {!previewLoading && previewData && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">预置全局题库（按类统计）</p>
                    <ul className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries(previewData.preset.by_category).map(([cat, n]) => (
                        <li
                          key={cat}
                          className="flex justify-between border border-gray-100 rounded px-2 py-1 bg-white"
                        >
                          <span className="text-gray-700">{cat}</span>
                          <span className="text-gray-500">{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2">本岗位专属题（全文列表）</p>
                    {previewData.job_questions.length === 0 ? (
                      <p className="text-xs text-gray-500">暂无专属题</p>
                    ) : (
                      <ol className="list-decimal pl-5 space-y-2 text-xs text-gray-800 max-h-52 overflow-y-auto pr-1">
                        {previewData.job_questions.map((q) => (
                          <li key={q.id}>
                            <span className="text-violet-800 font-medium">【{q.category}】</span> {q.text}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 编辑 */}
          {editOpen && (
            <section className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 text-sm">编辑题库</h3>
                <button
                  type="button"
                  className="text-xs text-gray-600 hover:underline"
                  onClick={() => setEditOpen(false)}
                >
                  收起
                </button>
              </div>

              {backgroundProfileId == null ? (
                <p className="text-xs text-gray-500 py-6">请先选择人物背景档案后再进行编辑。</p>
              ) : previewLoading ? (
                <div className="flex items-center gap-2 text-gray-600 text-sm py-6">
                  <Loader2 className="animate-spin" size={18} />
                  加载中…
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={generatingBank}
                      className="px-3 py-1.5 rounded-lg text-sm text-orange-700 hover:bg-orange-50 disabled:opacity-50 flex items-center gap-2 min-w-[160px] justify-center"
                      onClick={() => void handleGenerateReplace()}
                    >
                      <RotateCcw size={14} className="opacity-80" />
                      覆盖重生
                    </button>
                    <button
                      type="button"
                      disabled={generatingBank || jobBankCount === 0}
                      className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 flex items-center gap-2 min-w-[160px] justify-center"
                      onClick={() => void handleClearBank()}
                    >
                      <Eraser size={14} className="opacity-80" />
                      清空专属题
                    </button>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">题目列表（删改题干文本）</p>
                    {previewData?.job_questions?.length ? (
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {previewData.job_questions.map((q) => {
                          const draft = editDraft[q.id] ?? q.text;
                          const busy = editBusyId === q.id;
                          return (
                            <div key={q.id} className="border border-gray-200 rounded-lg p-2 bg-white">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-violet-800 font-medium text-xs">【{q.category}】</span>
                                <span className="text-[11px] text-gray-500">#{q.id}</span>
                              </div>
                              <textarea
                                className="w-full min-h-[64px] border border-gray-200 rounded-lg text-xs p-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                value={draft}
                                onChange={(e) => setEditDraft((prev) => ({ ...prev, [q.id]: e.target.value }))}
                              />
                              <div className="flex items-center justify-end gap-2 mt-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="px-3 py-1 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                                  onClick={() => {
                                    if (resumeId == null || backgroundProfileId == null) return;
                                    void (async () => {
                                      setEditBusyId(q.id);
                                      try {
                                        await updateJobInterviewQuestion({
                                          jobId,
                                          resumeId,
                                          backgroundProfileId,
                                          questionId: q.id,
                                          text: draft,
                                        });
                                        showSuccess('题目已保存');
                                        await loadPreview();
                                      } catch (e) {
                                        handleApiError(e, '保存失败');
                                      } finally {
                                        setEditBusyId(null);
                                      }
                                    })();
                                  }}
                                >
                                  {busy ? '保存中…' : '保存'}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  className="px-3 py-1 rounded-lg text-xs bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40"
                                  onClick={() => {
                                    if (resumeId == null || backgroundProfileId == null) return;
                                    if (!confirm('确定删除这道题？')) return;
                                    void (async () => {
                                      setEditBusyId(q.id);
                                      try {
                                        await deleteJobInterviewQuestion({
                                          jobId,
                                          resumeId,
                                          backgroundProfileId,
                                          questionId: q.id,
                                        });
                                        showSuccess('题目已删除');
                                        await loadPreview();
                                      } catch (e) {
                                        handleApiError(e, '删除失败');
                                      } finally {
                                        setEditBusyId(null);
                                      }
                                    })();
                                  }}
                                >
                                  删除
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">暂无可编辑题目</p>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 类型倾向选择 */}
          <section className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 text-sm">模拟面试题目类型倾向</h3>
              {preferredCategories ? (
                <span className="text-xs text-gray-600">已选择 {preferredCategories.length} 类</span>
              ) : (
                <span className="text-xs text-gray-500">不过滤（全库随机）</span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1"
                onClick={handleClearSelection}
              >
                <CircleDashed size={14} className="opacity-70" />
                不限类型
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1"
                onClick={handleSelectAll}
              >
                <CheckCircle2 size={14} className="opacity-70" />
                全选
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const checked = selectedCategories.has(c);
                return (
                  <label
                    key={c}
                    className={[
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none',
                      checked
                        ? 'border-amber-400 bg-amber-50 text-amber-950'
                        : 'border-gray-200 bg-white text-gray-600',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      checked={checked}
                      onChange={() => handleToggleCategory(c)}
                    />
                    {c}
                  </label>
                );
              })}
              {categories.length === 0 && (
                <p className="text-xs text-gray-500">加载题目类型失败，请稍后重试</p>
              )}
            </div>
          </section>
        </div>

        <footer className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">点击开始会根据所选类型抽取本场题单</span>
          <button
            type="button"
            disabled={startDisabled}
            className="px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
            onClick={() => {
              if (!canStartSimulation) {
                showInfo('请先为当前岗位选择简历');
                return;
              }
              onStartSimulation(preferredCategories);
              onClose();
            }}
          >
            <Mic size={16} className="opacity-90" />
            开始模拟面试
          </button>
        </footer>

        {generatingBank && (
          <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-white/85 backdrop-blur-[2px] gap-3">
            <Loader2 className="animate-spin text-violet-600" size={28} />
            <p className="text-sm text-gray-800 text-center">正在根据 JD 生成专属题目…</p>
            <p className="text-xs text-gray-500 text-center">生成可能需要较长时间，可随时取消</p>
            <button
              type="button"
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={cancelGenerate}
            >
              取消生成
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

