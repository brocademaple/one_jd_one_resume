import { useState, useCallback } from 'react';
import { X, Upload, Loader2, UserCheck } from 'lucide-react';

const ACCEPT =
  '.txt,.md,.markdown,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,text/plain';

export interface BackgroundImportModalProps {
  open: boolean;
  onClose: () => void;
  /** 解析文件为正文 + 建议显示名（不修改主弹窗编辑区） */
  parseBackgroundFile: (file: File) => Promise<{ text: string; suggestedName: string }>;
  /** 用户确认后创建新人物档案并切换为当前 */
  createProfileFromImport: (name: string, content: string) => Promise<void>;
  committing: boolean;
}

/**
 * 从文件导入新人物：独立弹窗内完成选择文件、解析、预览与确认创建。
 */
export function BackgroundImportModal({
  open,
  onClose,
  parseBackgroundFile,
  createProfileFromImport,
  committing,
}: BackgroundImportModalProps) {
  const [parsing, setParsing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftText, setDraftText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setParsing(false);
    setDraftName('');
    setDraftText('');
    setParseError(null);
  }, []);

  const handleClose = useCallback(() => {
    if (committing || parsing) return;
    reset();
    onClose();
  }, [committing, parsing, onClose, reset]);

  const handleFile = useCallback(
    async (file: File) => {
      setParseError(null);
      setParsing(true);
      try {
        const { text, suggestedName } = await parseBackgroundFile(file);
        setDraftText(text);
        setDraftName(suggestedName);
      } catch (e) {
        setDraftText('');
        setDraftName('');
        setParseError(e instanceof Error ? e.message : '文件解析失败，请检查格式或通义 API Key。');
      } finally {
        setParsing(false);
      }
    },
    [parseBackgroundFile],
  );

  const handleConfirm = useCallback(async () => {
    if (!draftText.trim() || committing) return;
    try {
      await createProfileFromImport(draftName, draftText);
      reset();
      onClose();
    } catch {
      /* createProfileFromImport 内已 alert */
    }
  }, [draftName, draftText, createProfileFromImport, committing, onClose, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[min(720px,94vw)] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-base font-semibold">从文件导入新人物</h2>
          <button
            type="button"
            className="p-1 hover:bg-gray-100 rounded"
            onClick={handleClose}
            disabled={committing || parsing}
            title="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs text-gray-600 leading-relaxed">
            选择文件后将在此弹窗内解析并预览。<strong className="text-gray-800">确认创建</strong>
            后才会写入数据库并出现在「我的背景」人物列表中。简历 PDF 需配置通义 API Key；扫描件走多模态识别。
          </p>

          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-3 space-y-2">
            <label
              className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded border border-gray-300 bg-white ${
                parsing || committing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
              }`}
            >
              <Upload size={13} />
              选择文件
              <input
                type="file"
                className="hidden"
                accept={ACCEPT}
                disabled={parsing || committing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void handleFile(file);
                }}
              />
            </label>
            {parsing && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" />
                正在解析…
              </p>
            )}
            {parseError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5">{parseError}</p>
            )}
          </div>

          {draftText.length > 0 && (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 space-y-2">
                <p className="text-xs font-medium text-amber-900">解析结果预览（未入库）</p>
                <div>
                  <label className="text-xs text-gray-600">显示名称</label>
                  <input
                    type="text"
                    className="mt-1 w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    maxLength={200}
                    disabled={committing}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600">正文</label>
                <textarea
                  className="mt-1 w-full min-h-[240px] border rounded-lg px-3 py-2 text-sm leading-relaxed"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  disabled={committing}
                />
              </div>
            </>
          )}
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-2 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            onClick={handleClose}
            disabled={committing || parsing}
          >
            取消
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
            onClick={() => void handleConfirm()}
            disabled={committing || parsing || !draftText.trim()}
          >
            {committing ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
            {committing ? '创建中…' : '确认创建新人物档案'}
          </button>
        </div>
      </div>
    </div>
  );
}
