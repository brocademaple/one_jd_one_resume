import type { Job, Resume } from '../types';

export type JobAnalysisStatus = 'collected' | 'decomposed' | 'compared';

export const ANALYSIS_STATUS_OPTIONS: {
  value: JobAnalysisStatus;
  label: string;
}[] = [
  { value: 'collected', label: '已收录' },
  { value: 'decomposed', label: '已拆解' },
  { value: 'compared', label: '已对照' },
];

export function getAnalysisStatusLabel(status: JobAnalysisStatus): string {
  return ANALYSIS_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? '已收录';
}

export function inferJobAnalysisStatus(
  job: Job,
  resumesForJob: Resume[],
  hasScorecard = false,
): JobAnalysisStatus {
  const contentLen = (job.content || '').trim().length;
  if (contentLen < 40) return 'collected';
  if (!resumesForJob.length) return 'decomposed';
  if (!hasScorecard) return 'decomposed';
  return 'compared';
}

export function analysisStatusChipClass(status: JobAnalysisStatus): string {
  switch (status) {
    case 'collected':
      return 'border border-slate-200/80 text-slate-600 bg-white/10';
    case 'decomposed':
      return 'bg-primary-500/15 text-primary-600 border border-primary-400/25';
    case 'compared':
      return 'border border-primary-600/50 text-primary-700 bg-white/20';
    default:
      return 'border border-slate-200 text-slate-600';
  }
}
