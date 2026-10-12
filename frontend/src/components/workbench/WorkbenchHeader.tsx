import { useState, useRef, useEffect } from 'react';
import { ChevronDown, UserCircle } from 'lucide-react';
import type { BackgroundProfilesController } from '../../hooks/useBackgroundProfiles';
import { getBackgroundBarLabel } from '../../hooks/useBackgroundProfiles';
import { useWorkbenchStore, type WorkbenchStep } from '../../store/useWorkbenchStore';

const STEPS: { step: WorkbenchStep; label: string }[] = [
  { step: 1, label: '岗位库' },
  { step: 2, label: '能力拆解 / 对照' },
  { step: 3, label: '证据与缺口' },
];

export interface WorkbenchHeaderActions {
  onExport?: () => void;
  onQuestionBank?: () => void;
  onMockInterview?: () => void;
  onPreApplyGuidance?: () => void;
  onOpenBackground: () => void;
  bg: BackgroundProfilesController;
}

export function WorkbenchHeader({
  onExport,
  onQuestionBank,
  onMockInterview,
  onPreApplyGuidance,
  onOpenBackground,
  bg,
}: WorkbenchHeaderActions) {
  const { step, setStep, setCenterTab } = useWorkbenchStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const label = getBackgroundBarLabel(bg);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current?.contains(e.target as Node)) return;
      setMoreOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [moreOpen]);

  return (
    <header className="flex-shrink-0 ojor-glass-flat border-b border-white/50 px-3 py-1.5 flex items-center gap-3 z-30">
      <div className="flex-shrink-0 min-w-0">
        <div className="text-[11px] font-bold tracking-wide text-slate-900 leading-tight">
          一岗一历
        </div>
        <div className="text-[9px] text-slate-500 uppercase tracking-wider">ONE JD · ONE RESUME</div>
      </div>

      <nav className="flex-1 flex items-center justify-center gap-4 min-w-0" aria-label="主场景步骤">
        {STEPS.map(({ step: s, label: l }) => {
          const active = step === s;
          return (
            <button
              key={s}
              type="button"
              className={[
                'relative text-[12px] font-medium pb-1 transition-colors whitespace-nowrap',
                active ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800',
              ].join(' ')}
              onClick={() => {
                setStep(s);
                if (s === 2) setCenterTab('analysis');
              }}
            >
              <span className="text-primary-400 mr-0.5">{s}</span>
              {l}
              {active && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-primary-600 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          className="hidden sm:inline-flex text-[11px] px-2.5 py-1 rounded-lg bg-primary-600 text-white hover:bg-primary-700 font-medium ojor-bubble"
          onClick={onPreApplyGuidance}
        >
          投前差距指导
        </button>

        <div className="relative" ref={moreRef}>
          <button
            type="button"
            className="flex items-center gap-0.5 text-[11px] text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-white/50"
            onClick={() => setMoreOpen((v) => !v)}
          >
            更多
            <ChevronDown size={14} />
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 ojor-glass py-1 min-w-[140px] z-50 text-[12px]">
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-white/60 text-slate-700"
                onClick={() => {
                  setMoreOpen(false);
                  onExport?.();
                }}
              >
                导出
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-white/60 text-slate-700"
                onClick={() => {
                  setMoreOpen(false);
                  onQuestionBank?.();
                }}
              >
                题库
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 hover:bg-white/60 text-slate-700"
                onClick={() => {
                  setMoreOpen(false);
                  onMockInterview?.();
                }}
              >
                模拟面试
              </button>
            </div>
          )}
        </div>

        <div
          className="hidden md:flex items-center gap-1 max-w-[140px] rounded-lg px-2 py-0.5 bg-white/40 border border-white/50"
          title={label}
        >
          <UserCircle size={14} className="text-primary-600 flex-shrink-0" />
          <span className="text-[10px] truncate text-slate-700">{label}</span>
        </div>
        <button
          type="button"
          className="text-[11px] px-2 py-1 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50"
          onClick={onOpenBackground}
        >
          我的背景
        </button>
      </div>
    </header>
  );
}
