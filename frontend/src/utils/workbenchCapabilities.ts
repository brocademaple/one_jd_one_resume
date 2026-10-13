import type { EvaluationScorecardApiResponse } from '../api';

export type CapabilityMatchState = 'done' | 'partial' | 'gap';

export interface WorkbenchCapability {
  id: string;
  /** 雷达轴 1–6（由 0–100 分换算） */
  score: number;
  /** 原始百分制分数 */
  scorePercent: number;
  label: string;
  dimensionName: string;
  matchState: CapabilityMatchState;
  highlightSnippet: string;
  suggestion?: string;
  summary?: string;
}

export function scorePercentToRadarLevel(scorePercent: number): number {
  if (scorePercent <= 0) return 0;
  return Math.max(1, Math.min(6, Math.round((scorePercent / 100) * 6)));
}

function normalizeMatchState(scorePercent: number, gap?: string | null): CapabilityMatchState {
  if (gap?.trim()) return 'gap';
  if (scorePercent >= 75) return 'done';
  if (scorePercent >= 50) return 'partial';
  return 'gap';
}

function findScorecardItem(
  items: EvaluationScorecardApiResponse['items'],
  dimensionName: string,
) {
  const exact = items.find((it) => it.competency === dimensionName);
  if (exact) return exact;
  return items.find(
    (it) =>
      it.competency.includes(dimensionName) ||
      dimensionName.includes(it.competency) ||
      dimensionName.split(/[/、]/).some((p) => p && it.competency.includes(p.trim())),
  );
}

function pickHighlightQuote(
  item: EvaluationScorecardApiResponse['items'][number] | undefined,
  jobContent: string,
  dimensionName: string,
): string {
  const fromEvidence = item?.evidence?.find((e) => e.quote?.trim())?.quote?.trim();
  if (fromEvidence) return fromEvidence.slice(0, 120);
  const kw = dimensionName.split(/[/、]/)[0]?.trim() || dimensionName;
  const idx = jobContent.indexOf(kw);
  if (idx >= 0) return jobContent.slice(idx, idx + Math.min(80, jobContent.length - idx)).trim();
  return item?.summary?.slice(0, 80) || '';
}

/** 按胜任力模型全量维度对齐评分卡（不截断维度数） */
export function buildCapabilitiesFromScorecard(
  dimensionNames: string[],
  scorecard: EvaluationScorecardApiResponse,
  jobContent: string,
): WorkbenchCapability[] {
  return dimensionNames.map((name, i) => {
    const item = findScorecardItem(scorecard.items, name);
    const scorePercent = item?.score ?? 0;
    const matchState = normalizeMatchState(scorePercent, item?.gap);
    const highlightSnippet = pickHighlightQuote(item, jobContent, name);
    return {
      id: `dim-${i}`,
      label: name.length > 12 ? `${name.slice(0, 11)}…` : name,
      dimensionName: name,
      score: scorePercentToRadarLevel(scorePercent),
      scorePercent,
      matchState,
      highlightSnippet,
      suggestion: item?.suggestion?.trim() || undefined,
      summary: item?.summary?.trim() || undefined,
    };
  });
}

export function getModelDimensions(
  models: Record<string, string[]>,
  profile: string | undefined,
  jobTitle: string,
): string[] {
  const p = (profile || 'default').trim();
  if (models[p]?.length) return models[p];
  const title = (jobTitle || '').toLowerCase();
  if (title.includes('产品') || title.includes('product') || title.includes('pm')) {
    return models.product ?? models.default ?? [];
  }
  if (
    title.includes('开发') ||
    title.includes('工程') ||
    title.includes('engineer') ||
    title.includes('前端') ||
    title.includes('后端')
  ) {
    return models.engineering ?? models.default ?? [];
  }
  if (title.includes('运营') || title.includes('operation')) {
    return models.operations ?? models.default ?? [];
  }
  return models.default ?? [];
}
