export type JobStatus = 'pending' | 'screening' | 'screening_fail' | 'interviewing' | 'interview_fail' | 'offered';

export const JOB_STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'pending', label: '待投递' },
  { value: 'screening', label: '筛选中' },
  { value: 'screening_fail', label: '筛选挂' },
  { value: 'interviewing', label: '面试中' },
  { value: 'interview_fail', label: '面试挂' },
  { value: 'offered', label: '已oc' },
];

export interface Job {
  id: number;
  title: string;
  company?: string;
  job_url?: string;
  salary?: string;
  content: string;
  status?: JobStatus | string;
  created_at: string;
  updated_at?: string;
}

export interface Resume {
  id: number;
  job_id: number;
  title?: string;
  content: string;
  version: number;
  created_at: string;
  updated_at?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ChatSession {
  jobId: number;
  resumeId: number;
  messages: Message[];
}

export interface ModelItem {
  id: string;
  name: string;
}

export interface ProviderConfig {
  name: string;
  name_cn: string;
  type: string;
  base_url?: string;
  env_key: string;
  models: ModelItem[];
  default_model: string;
}

export interface SettingsResponse {
  provider: string;
  model: string;
  api_keys_set: Record<string, string>;
  providers: Record<string, ProviderConfig>;
}

export interface CurrentProvider {
  provider: string;
  provider_name: string;
  model: string;
  model_name: string;
}

export interface UserBackground {
  id: number;
  content: string;
  created_at: string;
  updated_at?: string;
}

/** 面试指导摘录（按岗位收藏的 Agent 内容） */
export interface InterviewNote {
  id: string;
  content: string;
  created_at: number;
}
