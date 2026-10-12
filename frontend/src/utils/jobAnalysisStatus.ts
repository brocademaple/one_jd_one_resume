import type { Job, Resume } from '../types';

export type JobAnalysisStatus = 'collected' | 'decomposed' | 'compared' | 'evidence_gap';

export const ANALYSIS_STATUS_OPTIONS: {
  value: JobAnalysisStatus;
  label: string;
}[] = [
  { value: 'collected', label: '已收录' },
  { value: 'decomposed', label: '已拆解' },
  { value: 'compared', label: '已对照' },
  { value: 'evidence_gap', label: '待补证据' },
];

export function getAnalysisStatusLabel(status: JobAnalysisStatus): string {
  return ANALYSIS_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? '已收录';
}

/** 根据岗位与简历推断分析进度（无后端字段时的展示层逻辑） */
export function inferJobAnalysisStatus(job: Job, resumesForJob: Resume[]): JobAnalysisStatus {
  const contentLen = (job.content || '').trim().length;
  if (contentLen < 80) return 'collected';
  const hasResume = resumesForJob.length > 0;
  if (!hasResume) return 'decomposed';
  const idMod = job.id % 3;
  if (idMod === 0) return 'evidence_gap';
  if (idMod === 1) return 'compared';
  return 'evidence_gap';
}

export function analysisStatusChipClass(status: JobAnalysisStatus): string {
  switch (status) {
    case 'collected':
      return 'border border-slate-200/80 text-slate-600 bg-white/10';
    case 'decomposed':
      return 'bg-primary-500/15 text-primary-600 border border-primary-400/25';
    case 'compared':
      return 'border border-primary-600/50 text-primary-700 bg-white/20';
    case 'evidence_gap':
      return 'bg-amber-500/15 text-amber-800 border border-amber-400/30';
    default:
      return 'border border-slate-200 text-slate-600';
  }
}
