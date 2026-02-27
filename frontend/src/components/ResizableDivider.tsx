import { useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ResizableDividerProps {
  onResize: (delta: number) => void;
  onToggle: () => void;
  /** 左侧面板是否已收起 */
  collapsed: boolean;
}

export function ResizableDivider({ onResize, onToggle, collapsed }: ResizableDividerProps) {
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

  const ArrowIcon = collapsed ? ChevronRight : ChevronLeft;

  return (
    <div
      className="group relative flex-shrink-0 w-2 min-w-2 bg-gray-100 hover:bg-primary-100 transition-colors cursor-col-resize flex items-center justify-center select-none"
      onMouseDown={handleDividerMouseDown}
      title="拖动边界调整各栏宽度"
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gray-300 group-hover:bg-primary-400 rounded-full opacity-70" aria-hidden />
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggle(); }}
        className="absolute z-10 p-1.5 rounded-md bg-white border border-gray-200 shadow-sm hover:bg-primary-50 hover:border-primary-300 hover:text-primary-600 transition-all opacity-70 group-hover:opacity-100"
        title={collapsed ? '展开' : '收起'}
      >
        <ArrowIcon size={14} />
      </button>
    </div>
  );
}
