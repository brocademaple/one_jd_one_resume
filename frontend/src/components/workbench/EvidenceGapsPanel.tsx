import type { WorkbenchCapability } from '../../utils/workbenchCapabilities';
import { gapsFromCapabilities } from '../../utils/workbenchCapabilities';

interface EvidenceGapsPanelProps {
  capabilities: WorkbenchCapability[];
  compact?: boolean;
}

export function EvidenceGapsPanel({ capabilities, compact }: EvidenceGapsPanelProps) {
  const gaps = gapsFromCapabilities(capabilities);

  return (
    <div
      className={[
        'ojor-glass rounded-2xl border-amber-200/40',
        compact ? 'p-2.5' : 'p-3',
      ].join(' ')}
    >
      <h4 className="text-[12px] font-semibold text-amber-900 mb-1.5">待补证据</h4>
      {gaps.length === 0 ? (
        <p className="text-[11px] text-slate-500">当前维度均已覆盖，可继续细化表述。</p>
      ) : (
        <ul className="space-y-1">
          {gaps.map((g) => (
            <li key={g} className="text-[11px] text-amber-950 flex gap-1.5">
              <span className="text-amber-500">•</span>
              <span>{g}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
