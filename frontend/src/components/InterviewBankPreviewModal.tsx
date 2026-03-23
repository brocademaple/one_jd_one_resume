import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { fetchBankPreview } from '../api';
import { handleApiError } from '../utils/errorHandler';

interface InterviewBankPreviewModalProps {
  open: boolean;
  onClose: () => void;
  jobId: number;
  jobTitle: string;
  resumeId?: number | null;
  backgroundProfileId?: number | null;
}

export function InterviewBankPreviewModal({
  open,
  onClose,
  jobId,
  jobTitle,
  resumeId = null,
  backgroundProfileId = null,
}: InterviewBankPreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchBankPreview>> | null>(null);

  useEffect(() => {
    if (!open) {
      setData(null);
      return;
    }
    if (resumeId == null || backgroundProfileId == null) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchBankPreview({
      jobId,
      resumeId,
      backgroundProfileId,
    })
      .then(setData)
      .catch((e) => handleApiError(e, '加载题库预览失败'))
      .finally(() => setLoading(false));
  }, [open, jobId, resumeId, backgroundProfileId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bank-preview-title"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 id="bank-preview-title" className="text-sm font-semibold text-gray-900 truncate pr-2">
            题库预览 · {jobTitle}
          </h2>
          <button type="button" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 text-sm">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-8">
              <Loader2 className="animate-spin" size={20} />
              加载中…
            </div>
          )}
          {!loading && data && (
            <div className="space-y-4">
              <section>
                <h3 className="font-medium text-gray-800 mb-2">预置全局题库</h3>
                <p className="text-gray-600 text-xs mb-2">共 {data.preset.total} 题（按类）</p>
                <ul className="grid grid-cols-2 gap-1 text-xs text-gray-700">
                  {Object.entries(data.preset.by_category).map(([cat, n]) => (
                    <li key={cat} className="flex justify-between border border-gray-100 rounded px-2 py-1">
                      <span>{cat}</span>
                      <span className="text-gray-500">{n}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="font-medium text-gray-800 mb-2">本岗位专属题（{data.job_questions.length}）</h3>
                {data.job_questions.length === 0 ? (
                  <p className="text-gray-500 text-xs">暂无，可在栏头「星火」追加生成。</p>
                ) : (
                  <ol className="list-decimal pl-4 space-y-2 text-xs text-gray-800">
                    {data.job_questions.map((q) => (
                      <li key={q.id}>
                        <span className="text-violet-800 font-medium">【{q.category}】</span> {q.text}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
