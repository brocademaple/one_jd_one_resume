import { UserCircle, PanelLeft, FileText, MessageSquare } from 'lucide-react';
import type { BackgroundProfilesController } from '../hooks/useBackgroundProfiles';
import { getBackgroundBarLabel } from '../hooks/useBackgroundProfiles';

export interface ColumnToggleProps {
  jdCollapsed: boolean;
  resumeCollapsed: boolean;
  chatCollapsed: boolean;
  onToggleJd: () => void;
  onToggleResume: () => void;
  onToggleChat: () => void;
}

export interface AppHeaderBarProps {
  bg: BackgroundProfilesController;
  onOpenBackground: () => void;
  /** 主区三列收起/展开（人物背景左侧） */
  columnToggles?: ColumnToggleProps;
}

function toggleIconClass(collapsed: boolean) {
  return [
    'p-2 rounded-lg border transition-colors flex-shrink-0',
    collapsed
      ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm'
      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300',
  ].join(' ');
}

/**
 * 主工作区顶栏：可选三列切换图标 + 人物背景 +「我的背景」
 */
export function AppHeaderBar({ bg, onOpenBackground, columnToggles }: AppHeaderBarProps) {
  const label = getBackgroundBarLabel(bg);

  return (
    <header className="flex-shrink-0 flex items-center gap-3 px-3 sm:px-4 py-2 border-b border-gray-200 bg-white shadow-sm z-20">
      {columnToggles ? (
        <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0" aria-label="主区列显示">
          <button
            type="button"
            className={toggleIconClass(columnToggles.jdCollapsed)}
            title={columnToggles.jdCollapsed ? '展开 JD 与面试指导栏' : '收起 JD 与面试指导栏'}
            aria-label={columnToggles.jdCollapsed ? '展开 JD 与面试指导栏' : '收起 JD 与面试指导栏'}
            aria-pressed={columnToggles.jdCollapsed}
            onClick={columnToggles.onToggleJd}
          >
            <PanelLeft size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={toggleIconClass(columnToggles.resumeCollapsed)}
            title={columnToggles.resumeCollapsed ? '展开简历栏' : '收起简历栏'}
            aria-label={columnToggles.resumeCollapsed ? '展开简历栏' : '收起简历栏'}
            aria-pressed={columnToggles.resumeCollapsed}
            onClick={columnToggles.onToggleResume}
          >
            <FileText size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={toggleIconClass(columnToggles.chatCollapsed)}
            title={
              columnToggles.chatCollapsed
                ? '展开求职 Agent 对话栏'
                : '收起右侧求职 Agent 对话栏'
            }
            aria-label={
              columnToggles.chatCollapsed
                ? '展开求职 Agent 对话栏'
                : '收起右侧求职 Agent 对话栏'
            }
            aria-pressed={columnToggles.chatCollapsed}
            onClick={columnToggles.onToggleChat}
          >
            <MessageSquare size={18} strokeWidth={2} />
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-3 min-w-0 ml-auto">
        <div
          className="flex items-center gap-2 min-w-0 max-w-[min(280px,45vw)] rounded-lg px-2.5 py-1 bg-gray-50 border border-gray-100"
          title={`当前对话将使用档案「${label}」中的正文`}
        >
          <UserCircle size={18} className="flex-shrink-0 text-primary-600" />
          <div className="min-w-0 text-right">
            <div className="text-[10px] leading-tight text-gray-500 uppercase tracking-wide">人物背景</div>
            <div
              className="text-sm font-medium truncate text-gray-900"
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
      </div>
    </header>
  );
}
