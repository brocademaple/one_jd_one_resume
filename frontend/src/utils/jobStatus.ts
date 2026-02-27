import { Send, Search, XCircle, MessageCircle, CheckCircle } from 'lucide-react';
import type { JobStatus } from '../types';

export const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; color: string; bgColor: string; colorLight: string; bgColorLight: string; icon: typeof Send }
> = {
  pending: { label: '待投递', color: 'text-gray-400', bgColor: 'bg-gray-500/20', colorLight: 'text-gray-600', bgColorLight: 'bg-gray-100', icon: Send },
  screening: { label: '筛选中', color: 'text-blue-400', bgColor: 'bg-blue-500/20', colorLight: 'text-blue-600', bgColorLight: 'bg-blue-50', icon: Search },
  screening_fail: { label: '筛选挂', color: 'text-red-400', bgColor: 'bg-red-500/20', colorLight: 'text-red-600', bgColorLight: 'bg-red-50', icon: XCircle },
  interviewing: { label: '面试中', color: 'text-amber-400', bgColor: 'bg-amber-500/20', colorLight: 'text-amber-600', bgColorLight: 'bg-amber-50', icon: MessageCircle },
  interview_fail: { label: '面试挂', color: 'text-red-400', bgColor: 'bg-red-500/20', colorLight: 'text-red-600', bgColorLight: 'bg-red-50', icon: XCircle },
  offered: { label: '已oc', color: 'text-green-400', bgColor: 'bg-green-500/20', colorLight: 'text-green-600', bgColorLight: 'bg-green-50', icon: CheckCircle },
};

export function getStatusConfig(status: string | undefined) {
  const s = (status || 'pending') as JobStatus;
  return STATUS_CONFIG[s] ?? STATUS_CONFIG.pending;
}
