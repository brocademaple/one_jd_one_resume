import { UserCircle } from 'lucide-react';
import type { BackgroundProfilesController } from '../hooks/useBackgroundProfiles';
import { getBackgroundBarLabel } from '../hooks/useBackgroundProfiles';

export interface AppHeaderBarProps {
  bg: BackgroundProfilesController;
  onOpenBackground: () => void;
}

/**
 * 主工作区顶栏：右上角展示当前人物背景档案名 +「我的背景」入口
 */
export function AppHeaderBar({ bg, onOpenBackground }: AppHeaderBarProps) {
  const label = getBackgroundBarLabel(bg);
  const isPreview = bg.importDraftSnapshot != null;

  return (
    <header className="flex-shrink-0 flex items-center justify-end gap-3 px-3 sm:px-4 py-2 border-b border-gray-200 bg-white shadow-sm z-20">
      <div
        className={`flex items-center gap-2 min-w-0 max-w-[min(280px,45vw)] rounded-lg px-2.5 py-1 ${
          isPreview ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-100'
        }`}
        title={isPreview ? '文件导入预览中，对话仍使用导入前档案' : `当前对话将使用档案「${label}」中的正文`}
      >
        <UserCircle size={18} className={`flex-shrink-0 ${isPreview ? 'text-amber-700' : 'text-primary-600'}`} />
        <div className="min-w-0 text-right">
          <div className="text-[10px] leading-tight text-gray-500 uppercase tracking-wide">人物背景</div>
          <div
            className={`text-sm font-medium truncate ${
              isPreview ? 'text-amber-900' : 'text-gray-900'
            }`}
          >
            {label}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="text-sm px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-sm flex-shrink-0"
        onClick={onOpenBackground}
      >
        我的背景
      </button>
    </header>
  );
}
