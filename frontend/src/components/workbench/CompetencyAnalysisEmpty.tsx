import { Loader2, Sparkles } from 'lucide-react';

interface CompetencyAnalysisEmptyProps {
  needsResume: boolean;
  loading: boolean;
  running: boolean;
  onNewResume?: () => void;
  onRunAnalysis?: () => void;
}

export function CompetencyAnalysisEmpty({
  needsResume,
  loading,
  running,
  onNewResume,
  onRunAnalysis,
}: CompetencyAnalysisEmptyProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500 text-[13px]">
        <Loader2 className="animate-spin text-primary-600" size={22} />
        正在加载已有评分卡…
      </div>
    );
  }

  if (needsResume) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
        <p className="text-[13px] text-slate-600">能力对照需要一份当前岗位的定制简历。</p>
        <button
          type="button"
          className="text-[12px] px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700"
          onClick={onNewResume}
        >
          新建简历
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center max-w-sm mx-auto">
      <Sparkles className="text-primary-600" size={28} />
      <p className="text-[13px] text-slate-700 font-medium">尚无能力对照分析</p>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        将基于岗位 JD、当前简历与人物背景，调用后端评分卡生成能力雷达（与模拟面试评分同源）。
      </p>
      <button
        type="button"
        disabled={running}
        className="text-[12px] px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 flex items-center gap-1.5"
        onClick={onRunAnalysis}
      >
        {running ? <Loader2 size={14} className="animate-spin" /> : null}
        {running ? '分析中…' : '运行能力对照分析'}
      </button>
    </div>
  );
}
