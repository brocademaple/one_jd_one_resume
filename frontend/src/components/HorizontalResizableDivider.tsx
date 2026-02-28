import { useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface HorizontalResizableDividerProps {
  onResize: (deltaY: number) => void;
  onToggle: () => void;
  /** 下方面板（面试指导）是否已收起 */
  collapsed: boolean;
}

export function HorizontalResizableDivider({ onResize, onToggle, collapsed }: HorizontalResizableDividerProps) {
  const startY = useRef(0);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const delta = e.clientY - startY.current;
      onResize(delta);
      startY.current = e.clientY;
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
      startY.current = e.clientY;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  const ArrowIcon = collapsed ? ChevronDown : ChevronUp;

  return (
    <div
      className="group relative flex-shrink-0 h-2 min-h-2 bg-gray-100 hover:bg-amber-100 transition-colors cursor-row-resize flex items-center justify-center select-none"
      onMouseDown={handleDividerMouseDown}
      title="拖动边界调整上下高度"
    >
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-300 group-hover:bg-amber-400 rounded-full opacity-70" aria-hidden />
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggle(); }}
        className="absolute z-10 p-1 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 transition-all opacity-70 group-hover:opacity-100"
        title={collapsed ? '展开面试指导' : '收起面试指导'}
      >
        <ArrowIcon size={14} />
      </button>
    </div>
  );
}
