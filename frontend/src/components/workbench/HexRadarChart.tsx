import type { WorkbenchCapability } from '../../utils/workbenchCapabilities';

const SIZE = 280;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 88;

function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function hexPoints(radius: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const { x, y } = polar(i * 60, radius);
    return `${x},${y}`;
  }).join(' ');
}

interface HexRadarChartProps {
  capabilities: WorkbenchCapability[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  overlayMode?: boolean;
}

export function HexRadarChart({
  capabilities,
  selectedId,
  onSelect,
  overlayMode = false,
}: HexRadarChartProps) {
  const caps = capabilities.slice(0, 6);
  const scorePolygon = caps
    .map((c, i) => {
      const r = (c.score / 6) * R;
      const { x, y } = polar(i * 60, r);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="relative w-full max-w-[320px] mx-auto select-none">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto" aria-label="六维能力雷达">
        {[0.33, 0.66, 1].map((scale) => (
          <polygon
            key={scale}
            points={hexPoints(R * scale)}
            fill="none"
            stroke="rgba(97,114,243,0.18)"
            strokeWidth={1}
          />
        ))}
        {caps.map((_, i) => {
          const { x, y } = polar(i * 60, R);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="rgba(97,114,243,0.22)"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={scorePolygon}
          fill={overlayMode ? 'rgba(68,76,231,0.35)' : 'rgba(97,114,243,0.28)'}
          stroke="#444CE7"
          strokeWidth={1.5}
          className="transition-all duration-200"
        />
        <circle cx={CX} cy={CY} r={28} fill="#6172F3" className="drop-shadow-sm" />
        <text
          x={CX}
          y={CY - 4}
          textAnchor="middle"
          className="fill-white text-[11px] font-semibold"
        >
          {caps.length}项
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" className="fill-white/90 text-[9px]">
          能力
        </text>
      </svg>

      {caps.map((cap, i) => {
        const { x, y } = polar(i * 60, R + 42);
        const selected = cap.id === selectedId;
        const stateLabel =
          cap.matchState === 'done' ? '已做到' : cap.matchState === 'partial' ? '部分覆盖' : '待补证据';
        return (
          <button
            key={cap.id}
            type="button"
            className={[
              'ojor-bubble absolute -translate-x-1/2 -translate-y-1/2 text-left min-w-[72px] max-w-[96px]',
              'rounded-2xl px-2.5 py-1.5 border shadow-sm backdrop-blur-md',
              selected
                ? 'border-primary-600 bg-white/90 ring-2 ring-primary-500/40 scale-[1.03]'
                : 'border-white/60 bg-white/70 hover:border-primary-300',
            ].join(' ')}
            style={{ left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%` }}
            onClick={() => onSelect(cap.id)}
          >
            <div className="text-[11px] font-semibold text-slate-900 leading-tight">{cap.label}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">{stateLabel}</div>
          </button>
        );
      })}
    </div>
  );
}
