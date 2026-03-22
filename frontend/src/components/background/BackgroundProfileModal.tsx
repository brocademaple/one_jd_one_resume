import { X } from 'lucide-react';
import type { BackgroundProfile } from '../../types';
import { BackgroundUploadSection } from './BackgroundUploadSection';
import { BackgroundProfileEditor } from './BackgroundProfileEditor';

export interface BackgroundProfileModalProps {
  open: boolean;
  onClose: () => void;
  loadingProfiles: boolean;
  profiles: BackgroundProfile[];
  activeProfileId: number | null;
  editingName: string;
  background: string;
  uploadingBg: boolean;
  savingBackground: boolean;
  creatingProfileFromText: boolean;
  backgroundSaved: boolean;
  onSelectProfile: (id: number) => void;
  onNewProfile: () => void;
  onDeleteProfile: () => void;
  onEditingNameChange: (v: string) => void;
  onBackgroundChange: (v: string) => void;
  onSave: () => void;
  onFileSelected: (file: File) => void;
  onCreateProfileFromParsedText: () => void;
  onEditorDirty: () => void;
  importDraftMode: boolean;
  onAbandonImportDraft: () => void;
  onCommitImportDraft: () => void;
}

/**
 * 「我的背景」弹窗：上传区与编辑区分为两个子模块组合。
 */
export function BackgroundProfileModal({
  open,
  onClose,
  loadingProfiles,
  profiles,
  activeProfileId,
  editingName,
  background,
  uploadingBg,
  savingBackground,
  creatingProfileFromText,
  backgroundSaved,
  onSelectProfile,
  onNewProfile,
  onDeleteProfile,
  onEditingNameChange,
  onBackgroundChange,
  onSave,
  onFileSelected,
  onCreateProfileFromParsedText,
  onEditorDirty,
  importDraftMode,
  onAbandonImportDraft,
  onCommitImportDraft,
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
            <strong className="text-gray-700"> 下方「导入文件」与「编辑正文」分开操作：</strong>
            导入支持纯文本（.txt / .md）、PDF、Word、图片；其中<strong className="text-gray-700"> 简历 PDF </strong>经通义整理（需通义 API Key）。解析完成后进入<strong className="text-gray-700"> 待创建档案预览 </strong>，需点击「确认保存为新档案」才会入库；期间对话仍使用导入前的档案。
          </p>

          <BackgroundUploadSection
            uploading={uploadingBg}
            disabled={loadingProfiles}
            importDraftActive={importDraftMode}
            onFileSelected={onFileSelected}
          />

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
              importDraftMode={importDraftMode}
              onAbandonImportDraft={onAbandonImportDraft}
              onCommitImportDraft={onCommitImportDraft}
              committingImport={savingBackground}
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
