import { useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ResizableDividerProps {
  onResize: (delta: number) => void;
  onToggle: () => void;
  /** 左侧面板是否已收起 */
  collapsed: boolean;
  /**
   * 收缩按钮的纵向锚点。主内容区相邻两条竖线请用 upper / lower 错开，避免图标叠在一起难分辨、易误触。
   */
  toggleAnchor?: 'center' | 'upper' | 'lower';
  /** 左侧面板名称，用于悬停提示，如「JD 与面试指导」「简历」 */
  panelLabel?: string;
  /** 为 true 时表示收起的是**竖线右侧**的面板（如对话栏），提示文案会写「收起右侧…」 */
  collapsesRightPanel?: boolean;
  /**
   * 自定义展开/收起提示（与 panelLabel 二选一优先使用本项）。
   * 例：侧边栏 `toggleExpandLabel="展开岗位栏"`、`toggleCollapseLabel="收起岗位栏"`。
   */
  toggleExpandLabel?: string;
  toggleCollapseLabel?: string;
}

const anchorClass: Record<NonNullable<ResizableDividerProps['toggleAnchor']>, string> = {
  center: 'top-1/2 -translate-y-1/2',
  upper: 'top-[24%] -translate-y-1/2',
  lower: 'top-[76%] -translate-y-1/2',
};

export function ResizableDivider({
  onResize,
  onToggle,
  collapsed,
  toggleAnchor = 'center',
  panelLabel,
  collapsesRightPanel = false,
  toggleExpandLabel,
  toggleCollapseLabel,
}: ResizableDividerProps) {
  const startX = useRef(0);
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startX.current = e.clientX;
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const delta = e.clientX - startX.current;
      onResize(delta);
      startX.current = e.clientX;
    },
    [onResize],
  );

  const handleMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      startX.current = e.clientX;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  /**
   * 左侧栏（岗位栏、JD）：展开时箭头朝左表示「向左收起」；收起时朝右表示「向右展开」。
   * 右侧 Agent 栏（collapsesRightPanel）：展开时朝右表示「收起右侧」；收起时朝左表示「展开」。
   */
  const ArrowIcon = collapsesRightPanel
    ? collapsed
      ? ChevronLeft
      : ChevronRight
    : collapsed
      ? ChevronRight
      : ChevronLeft;
  const toggleTitle =
    toggleExpandLabel && toggleCollapseLabel
      ? collapsed
        ? toggleExpandLabel
        : toggleCollapseLabel
      : panelLabel
        ? collapsesRightPanel
          ? collapsed
            ? `展开「${panelLabel}」`
            : `收起右侧「${panelLabel}」`
          : collapsed
            ? `展开「${panelLabel}」栏`
            : `收起「${panelLabel}」栏`
        : collapsed
          ? '展开'
          : '收起';

  return (
    <div
      className="group relative flex-shrink-0 w-2.5 min-w-2.5 bg-gray-100 hover:bg-primary-100 transition-colors cursor-col-resize flex items-center justify-center select-none"
      onMouseDown={handleDividerMouseDown}
      title="拖动竖线调整相邻栏宽度"
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-300 group-hover:bg-primary-400 rounded-full opacity-70" aria-hidden />
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onToggle();
        }}
        className={`absolute z-10 left-1/2 -translate-x-1/2 ${anchorClass[toggleAnchor]} flex items-center justify-center min-h-10 min-w-10 p-2 rounded-lg bg-white/95 border border-gray-200 shadow-md hover:bg-primary-50 hover:border-primary-300 hover:text-primary-600 transition-all opacity-90 group-hover:opacity-100`}
        title={toggleTitle}
        aria-label={toggleTitle}
      >
        <ArrowIcon size={16} strokeWidth={2.25} />
      </button>
    </div>
  );
}
