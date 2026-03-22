import { Loader2, Plus, Trash2, Save, Check, UserPlus, Undo2, UserCheck } from 'lucide-react';
import type { BackgroundProfile } from '../../types';
import { BACKGROUND_FORMAT_SHORT_HINT } from '../../constants/backgroundFormat';

export interface BackgroundProfileEditorProps {
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
  onDirty: () => void;
  importDraftMode: boolean;
  onAbandonImportDraft: () => void;
  onCommitImportDraft: () => void;
  committingImport: boolean;
}

/**
 * 背景「展示与编辑」：人物切换、显示名、正文、手动保存、从正文新建档案（不含文件上传）。
 */
export function BackgroundProfileEditor({
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
  onDirty,
  importDraftMode,
  onAbandonImportDraft,
  onCommitImportDraft,
  committingImport,
}: BackgroundProfileEditorProps) {
  return (
    <div className="space-y-3">
      {importDraftMode && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 space-y-2">
          <p className="text-sm font-medium text-amber-900">待创建的人物档案（预览）</p>
          <p className="text-xs text-amber-900/90 leading-relaxed">
            以下为文件解析结果，尚未写入数据库。请核对「显示名称」与正文后，点击「确认保存为新档案」创建；对话仍使用导入前的档案内容。不需要可点「放弃导入」恢复。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="text-xs inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
              onClick={onAbandonImportDraft}
              disabled={committingImport}
            >
              <Undo2 size={14} />
              放弃导入
            </button>
            <button
              type="button"
              className="text-xs inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              onClick={() => void onCommitImportDraft()}
              disabled={committingImport || !background.trim()}
            >
              {committingImport ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              {committingImport ? '创建中…' : '确认保存为新档案'}
            </button>
          </div>
        </div>
      )}
      {loadingProfiles && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" />
          加载档案…
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-600 shrink-0">当前人物</label>
        <select
          className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 min-w-[160px] max-w-[240px]"
          value={activeProfileId ?? ''}
          onChange={(e) => onSelectProfile(Number(e.target.value))}
          disabled={loadingProfiles || profiles.length === 0 || importDraftMode}
          title={importDraftMode ? '请先确认或放弃导入预览' : undefined}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || `档案 #${p.id}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="text-xs inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
          onClick={() => void onNewProfile()}
          disabled={loadingProfiles || importDraftMode}
        >
          <Plus size={14} />
          新建
        </button>
        <button
          type="button"
          className="text-xs inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
          onClick={() => void onDeleteProfile()}
          disabled={loadingProfiles || importDraftMode || profiles.length <= 1 || activeProfileId == null}
          title={profiles.length <= 1 ? '至少保留一份档案' : '删除当前档案'}
        >
          <Trash2 size={14} />
          删除
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-gray-600 shrink-0">显示名称</label>
        <input
          type="text"
          className="flex-1 min-w-[200px] text-sm border border-gray-300 rounded-lg px-3 py-1.5"
          value={editingName}
          onChange={(e) => {
            onEditingNameChange(e.target.value);
            onDirty();
          }}
          placeholder="如：张三、候选人 A"
          maxLength={200}
          disabled={activeProfileId == null}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="text-xs inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary-200 bg-primary-50/80 text-primary-800 hover:bg-primary-100 disabled:opacity-50"
          onClick={() => void onCreateProfileFromParsedText()}
          disabled={loadingProfiles || importDraftMode || creatingProfileFromText || !background.trim()}
          title="从正文中的「姓名」等字段识别名字，复制全文到新档案并切换到新人物"
        >
          {creatingProfileFromText ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          从正文解析为新人物档案
        </button>
        <span className="text-xs text-gray-400">识别「姓名 / 名字」后新建一条档案，可选清空「默认」中的重复正文</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed border-l-2 border-primary-200/80 pl-2.5 py-1 bg-primary-50/40 rounded-r">
        {BACKGROUND_FORMAT_SHORT_HINT}
      </p>
      <textarea
        className="w-full min-h-[320px] border rounded-lg px-3 py-2 text-sm leading-relaxed"
        value={background}
        onChange={(e) => {
          onBackgroundChange(e.target.value);
          onDirty();
        }}
        placeholder="在此维护当前人物的完整背景（纯文本分段即可，无需 Markdown # 标题）…"
      />
      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
        <span className="text-sm text-gray-500">
          {backgroundSaved ? (
            <span className="inline-flex items-center gap-1 text-green-600">
              <Check size={14} /> 已保存到数据库
            </span>
          ) : importDraftMode ? (
            <span className="text-amber-800">预览中：请使用上方「确认保存为新档案」创建新人物，勿使用本按钮。</span>
          ) : (
            '保存将写入当前选中档案；发消息时会自动带入该档案正文。'
          )}
        </span>
        <button
          type="button"
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
          disabled={importDraftMode || savingBackground || activeProfileId == null}
          onClick={() => void onSave()}
        >
          {savingBackground ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {savingBackground ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
}
