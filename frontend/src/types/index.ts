export interface Job {
  id: number;
  title: string;
  company?: string;
  content: string;
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
