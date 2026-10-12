import type { Job } from '../types';

export type CapabilityMatchState = 'done' | 'partial' | 'gap';

export interface WorkbenchCapability {
  id: string;
  label: string;
  score: number;
  matchState: CapabilityMatchState;
  /** 用于在 JD 正文中高亮的子串（取首条命中） */
  highlightSnippet: string;
  evidenceHint?: string;
}

const WIREframe_FALLBACK: WorkbenchCapability[] = [
  { id: 'c1', label: '用户增长', score: 5, matchState: 'done', highlightSnippet: '提升聊天活跃、关系沉淀' },
  { id: 'c2', label: '社交产品', score: 4, matchState: 'done', highlightSnippet: 'IM与社交产品功能演进' },
  { id: 'c3', label: '跨端协作', score: 3, matchState: 'gap', highlightSnippet: '协同全球算法、研发、设计和运营团队', evidenceHint: '跨端（iOS/Android）协作复盘' },
  { id: 'c4', label: 'AI 场景设计', score: 4, matchState: 'partial', highlightSnippet: '驱动AI在社交场景的系统化落地', evidenceHint: 'AI 推荐场景落地案例' },
  { id: 'c5', label: '数据驱动', score: 5, matchState: 'done', highlightSnippet: '有数据敏感和判断力' },
  { id: 'c6', label: '商业化意识', score: 3, matchState: 'partial', highlightSnippet: '商业化与变现设计' },
];

function shortenLabel(name: string, max = 8): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + '…';
}

function findSnippet(content: string, keywords: string[]): string {
  const lower = content.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 8);
      const end = Math.min(content.length, idx + kw.length + 24);
      return content.slice(start, end).replace(/\s+/g, ' ').trim();
    }
  }
  const line = content.split('\n').find((l) => l.trim().length > 12);
  return line?.trim().slice(0, 40) ?? '岗位职责与任职要求';
}

export function buildCapabilitiesFromDimensions(
  job: Job,
  dimensionNames: string[],
): WorkbenchCapability[] {
  const content = job.content || '';
  const picked = dimensionNames.slice(0, 6);
  if (picked.length < 6) {
    while (picked.length < 6 && WIREframe_FALLBACK[picked.length]) {
      picked.push(WIREframe_FALLBACK[picked.length].label);
    }
  }
  return picked.slice(0, 6).map((name, i) => {
    const seed = (job.id + i * 7) % 5;
    const score = Math.min(6, Math.max(1, 2 + seed));
    const matchState: CapabilityMatchState =
      seed <= 1 ? 'gap' : seed === 2 ? 'partial' : 'done';
    const kw = name.split(/[/、与]/)[0]?.trim() || name;
    return {
      id: `dim-${i}`,
      label: shortenLabel(name, 10),
      score,
      matchState,
      highlightSnippet: findSnippet(content, [kw, name.slice(0, 4)]),
      evidenceHint: matchState !== 'done' ? `补充「${shortenLabel(name, 12)}」相关案例` : undefined,
    };
  });
}

export function defaultCapabilitiesForJob(job: Job | null): WorkbenchCapability[] {
  if (!job) return WIREframe_FALLBACK;
  return buildCapabilitiesFromDimensions(job, WIREframe_FALLBACK.map((c) => c.label));
}

export function gapsFromCapabilities(caps: WorkbenchCapability[]): string[] {
  return caps.filter((c) => c.matchState !== 'done' && c.evidenceHint).map((c) => c.evidenceHint!);
}
