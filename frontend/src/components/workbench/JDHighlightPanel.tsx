import { useMemo } from 'react';
import type { Job } from '../../types';
import type { WorkbenchCapability } from '../../utils/workbenchCapabilities';

interface JDHighlightPanelProps {
  job: Job;
  capabilities: WorkbenchCapability[];
  selectedCapability: WorkbenchCapability | null;
}

function splitContentWithHighlights(content: string, snippet: string | undefined) {
  if (!snippet || snippet.length < 4) {
    return [{ text: content, highlight: false }];
  }
  const idx = content.indexOf(snippet.slice(0, Math.min(12, snippet.length)));
  if (idx < 0) {
    const short = snippet.slice(0, 8);
    const i2 = content.indexOf(short);
    if (i2 < 0) return [{ text: content, highlight: false }];
    return [
      { text: content.slice(0, i2), highlight: false },
      { text: content.slice(i2, i2 + short.length + 40), highlight: true },
      { text: content.slice(i2 + short.length + 40), highlight: false },
    ];
  }
  const len = Math.min(snippet.length + 20, content.length - idx);
  return [
    { text: content.slice(0, idx), highlight: false },
    { text: content.slice(idx, idx + len), highlight: true },
    { text: content.slice(idx + len), highlight: false },
  ];
}

export function JDHighlightPanel({ job, capabilities, selectedCapability }: JDHighlightPanelProps) {
  const plain = useMemo(() => job.content.replace(/^#.+$/m, '').trim(), [job.content]);
  const parts = useMemo(
    () => splitContentWithHighlights(plain, selectedCapability?.highlightSnippet),
    [plain, selectedCapability],
  );

  return (
    <div className="flex flex-col h-full min-h-0 ojor-glass rounded-2xl overflow-hidden">
      <div className="flex-shrink-0 px-3 py-2 border-b border-white/50 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-slate-900">JD 原文 · 能力高光</h3>
        {selectedCapability && (
          <span className="text-[10px] text-primary-600 font-medium truncate max-w-[40%]">
            连线：{selectedCapability.label}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap">
        {parts.map((p, i) =>
          p.highlight ? (
            <mark
              key={i}
              className="bg-primary-500/12 border-l-[3px] border-primary-600 pl-2 py-0.5 rounded-r-md not-italic"
            >
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </div>
      <div className="flex-shrink-0 px-3 py-1.5 border-t border-white/40 text-[10px] text-slate-500">
        点击左侧能力气泡可切换高光句 · 共 {capabilities.length} 项维度
      </div>
    </div>
  );
}
