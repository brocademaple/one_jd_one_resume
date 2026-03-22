import { Loader2, Upload } from 'lucide-react';

const ACCEPT =
  '.txt,.md,.markdown,.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,text/plain';

export interface BackgroundUploadSectionProps {
  uploading: boolean;
  disabled?: boolean;
  /** 有待确认的导入预览时禁止再次选择文件 */
  importDraftActive?: boolean;
  /** 仅负责把用户选择的文件交给上层；解析与入库由 hook 完成 */
  onFileSelected: (file: File) => void;
}

/**
 * 背景「上传 / 导入」独立区块：只含文件选择与解析中状态，不包含正文编辑。
 */
export function BackgroundUploadSection({
  uploading,
  disabled,
  importDraftActive,
  onFileSelected,
}: BackgroundUploadSectionProps) {
  const blockUpload = disabled || uploading || importDraftActive;
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-3 space-y-2">
      <p className="text-xs font-medium text-gray-600">导入文件（解析后进入「待创建档案」预览，确认后再保存入库）</p>
      <p className="text-xs text-gray-500 leading-relaxed">
        简历 <strong className="text-gray-700">PDF</strong> 将使用通义千问整理为结构化背景（需在模型设置中配置通义 API Key）；扫描件会走多模态识别。其他格式仍走本地解析。
      </p>
      {importDraftActive && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          请先对下方预览点击「确认保存为新档案」或「放弃导入」，再上传新文件。
        </p>
      )}
      <label
        className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded border border-gray-300 bg-white ${
          blockUpload ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
        }`}
      >
        <Upload size={13} />
        选择文件
        <input
          type="file"
          className="hidden"
          accept={ACCEPT}
          disabled={blockUpload}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onFileSelected(file);
          }}
        />
      </label>
      {uploading && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" />
          正在解析文件…
        </p>
      )}
    </div>
  );
}
