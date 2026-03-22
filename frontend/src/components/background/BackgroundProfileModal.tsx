import { X, FileUp } from 'lucide-react';
import type { BackgroundProfile } from '../../types';
import { BackgroundProfileEditor } from './BackgroundProfileEditor';

export interface BackgroundProfileModalProps {
  open: boolean;
  onClose: () => void;
  /** 打开「从文件导入新人物」子弹窗 */
  onOpenImportModal: () => void;
  loadingProfiles: boolean;
  profiles: BackgroundProfile[];
  activeProfileId: number | null;
  editingName: string;
  background: string;
  savingBackground: boolean;
  creatingProfileFromText: boolean;
  backgroundSaved: boolean;
  onSelectProfile: (id: number) => void;
  onNewProfile: () => void;
  onDeleteProfile: () => void;
  onEditingNameChange: (v: string) => void;
  onBackgroundChange: (v: string) => void;
  onSave: () => void;
  onCreateProfileFromParsedText: () => void;
  onEditorDirty: () => void;
}

/**
 * 「我的背景」弹窗：入口按钮打开导入子弹窗；编辑区在下方。
 */
export function BackgroundProfileModal({
  open,
  onClose,
  onOpenImportModal,
  loadingProfiles,
  profiles,
  activeProfileId,
  editingName,
  background,
  savingBackground,
  creatingProfileFromText,
  backgroundSaved,
  onSelectProfile,
  onNewProfile,
  onDeleteProfile,
  onEditingNameChange,
  onBackgroundChange,
  onSave,
  onCreateProfileFromParsedText,
  onEditorDirty,
}: BackgroundProfileModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[760px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">我的背景（全面信息汇总）</h2>
          <button type="button" className="p-1 hover:bg-gray-100 rounded" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-gray-500">
            可维护多份人物档案并切换；对话时会使用当前选中档案的正文。包含：基本信息、学历、实习、项目、作品集等。
            <strong className="text-gray-700"> 从文件新增人物：</strong>
            点击下方按钮在单独窗口中选择文件并预览解析结果，确认后才会入库；期间不会改动此处编辑区。手动编辑与「从正文解析为新人物」仍在下方操作。
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="text-xs inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-primary-300 bg-primary-50 text-primary-800 hover:bg-primary-100 disabled:opacity-50"
              onClick={onOpenImportModal}
              disabled={loadingProfiles}
            >
              <FileUp size={15} />
              从文件导入新人物…
            </button>
            <span className="text-xs text-gray-500">支持 .txt / .md、PDF、Word、图片；简历 PDF 需通义 API Key</span>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-600 mb-2">编辑与展示</p>
            <BackgroundProfileEditor
              loadingProfiles={loadingProfiles}
              profiles={profiles}
              activeProfileId={activeProfileId}
              editingName={editingName}
              background={background}
              savingBackground={savingBackground}
              creatingProfileFromText={creatingProfileFromText}
              backgroundSaved={backgroundSaved}
              onSelectProfile={onSelectProfile}
              onNewProfile={onNewProfile}
              onDeleteProfile={onDeleteProfile}
              onEditingNameChange={onEditingNameChange}
              onBackgroundChange={onBackgroundChange}
              onSave={onSave}
              onCreateProfileFromParsedText={onCreateProfileFromParsedText}
              onDirty={onEditorDirty}
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end bg-gray-50 rounded-b-xl">
          <button
            type="button"
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
