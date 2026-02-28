import { useState, useMemo } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getPreviewPdfUrl, downloadResumeWithOptions, type ExportOptions } from '../api';

const FONT_SIZE_OPTIONS_PDF = [
  { value: 9, label: '小 (9pt)' },
  { value: 10, label: '默认 (10pt)' },
  { value: 11, label: '大 (11pt)' },
  { value: 12, label: '超大 (12pt)' },
];

const FONT_SIZE_OPTIONS_WORD = [
  { value: 10, label: '小 (10pt)' },
  { value: 11, label: '默认 (11pt)' },
  { value: 12, label: '大 (12pt)' },
  { value: 14, label: '超大 (14pt)' },
];

const MARGIN_OPTIONS = [
  { value: 1.5, label: '窄 (1.5cm)' },
  { value: 2, label: '默认 (2cm)' },
  { value: 2.5, label: '宽 (2.5cm)' },
];

interface ExportPreviewModalProps {
  open: boolean;
  onClose: () => void;
  format: 'pdf' | 'word';
  resumeId: number;
  resumeTitle?: string;
  /** Markdown content for Word preview (HTML simulation) */
  content: string;
}

function cleanContent(s: string): string {
  return s.replace(/===RESUME_START===\n?/g, '').replace(/===RESUME_END===\n?/g, '');
}

export function ExportPreviewModal({
  open,
  onClose,
  format,
  resumeId,
  resumeTitle,
  content,
}: ExportPreviewModalProps) {
  const isPdf = format === 'pdf';
  const fontOptions = isPdf ? FONT_SIZE_OPTIONS_PDF : FONT_SIZE_OPTIONS_WORD;
  const defaultFont = isPdf ? 10 : 11;

  const [fontSize, setFontSize] = useState(defaultFont);
  const [marginCm, setMarginCm] = useState(2);
  const [saving, setSaving] = useState(false);

  const options: ExportOptions = useMemo(() => ({ fontSize, marginCm }), [fontSize, marginCm]);

  const previewPdfUrl = isPdf ? getPreviewPdfUrl(resumeId, options) : '';
  const suggestedFilename = resumeTitle?.replace(/[<>:"/\\|?*]/g, '').trim() || `简历_${resumeId}`;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      await downloadResumeWithOptions(format, resumeId, options, suggestedFilename);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : '导出失败');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-4xl h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            导出预览 · {format === 'pdf' ? 'PDF' : 'Word'}
          </h2>
          <button
            type="button"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={onClose}
            title="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
          {/* 左侧：预览区 */}
          <div className="flex-1 min-h-0 flex flex-col border-r border-gray-200">
            <div className="px-4 py-2 border-b border-gray-100 text-sm text-gray-500">
              预览效果 ({isPdf ? 'PDF 实际效果' : '样式示意，Word 导出与此一致'})
            </div>
            <div className="flex-1 min-h-0 overflow-auto bg-gray-100 p-4">
              {isPdf ? (
                <iframe
                  title="PDF 预览"
                  src={previewPdfUrl}
                  className="w-full h-full min-h-[500px] bg-white rounded shadow"
                />
              ) : (
                <div
                  className="mx-auto bg-white shadow rounded-lg p-8 max-w-[21cm] min-h-[29.7cm]"
                  style={{
                    fontSize: `${fontSize}pt`,
                    margin: `${marginCm}cm`,
                  }}
                >
                  <div className="markdown-content prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {cleanContent(content)}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：选项 */}
          <div className="w-64 flex-shrink-0 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">字体大小</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
              >
                {fontOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">页边距</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={marginCm}
                onChange={e => setMarginCm(Number(e.target.value))}
              >
                {MARGIN_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            type="button"
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
            disabled={saving}
            onClick={handleConfirm}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {saving ? '正在导出…' : '确定并保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
