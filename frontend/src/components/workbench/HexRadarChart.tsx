import type { WorkbenchCapability } from '../../utils/workbenchCapabilities';

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 86;

function polar(index: number, radius: number, n: number) {
  const rad = (((index * 360) / n - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function ngonPoints(radius: number, n: number): string {
  return Array.from({ length: n }, (_, i) => {
    const { x, y } = polar(i, radius, n);
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
  const caps = capabilities;
  const n = caps.length;
  if (n < 3) {
    return (
      <p className="text-[12px] text-slate-500 text-center py-8">胜任力模型维度不足，无法绘制雷达图</p>
    );
  }

  const scorePolygon = caps
    .map((c, i) => {
      const level = c.score <= 0 ? 0.08 : c.score / 6;
      const { x, y } = polar(i, R * level, n);
      return `${x},${y}`;
    })
    .join(' ');

  const labelRadius = R + 48;

  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none min-h-[280px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto" aria-label="能力雷达">
        {[0.33, 0.66, 1].map((scale) => (
          <polygon
            key={scale}
            points={ngonPoints(R * scale, n)}
            fill="none"
            stroke="rgba(97,114,243,0.18)"
            strokeWidth={1}
          />
        ))}
        {caps.map((_, i) => {
          const { x, y } = polar(i, R, n);
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
        <circle cx={CX} cy={CY} r={26} fill="#6172F3" className="drop-shadow-sm" />
        <text x={CX} y={CY - 3} textAnchor="middle" className="fill-white text-[11px] font-semibold">
          {n}项
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" className="fill-white/90 text-[9px]">
          能力
        </text>
      </svg>

      {caps.map((cap, i) => {
        const { x, y } = polar(i, labelRadius, n);
        const selected = cap.id === selectedId;
        const stateLabel =
          cap.matchState === 'done'
            ? `已做到 · ${cap.scorePercent}分`
            : cap.matchState === 'partial'
              ? `部分 · ${cap.scorePercent}分`
              : `${cap.scorePercent}分`;
        return (
          <button
            key={cap.id}
            type="button"
            title={cap.dimensionName}
            className={[
              'ojor-bubble absolute -translate-x-1/2 -translate-y-1/2 text-left min-w-[68px] max-w-[100px]',
              'rounded-2xl px-2 py-1.5 border shadow-sm backdrop-blur-md',
              selected
                ? 'border-primary-600 bg-white/90 ring-2 ring-primary-500/40 scale-[1.03]'
                : 'border-white/60 bg-white/70 hover:border-primary-300',
            ].join(' ')}
            style={{ left: `${(x / SIZE) * 100}%`, top: `${(y / SIZE) * 100}%` }}
            onClick={() => onSelect(cap.id)}
          >
            <div className="text-[10px] font-semibold text-slate-900 leading-tight line-clamp-2">
              {cap.label}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">{stateLabel}</div>
          </button>
        );
      })}
    </div>
  );
}
