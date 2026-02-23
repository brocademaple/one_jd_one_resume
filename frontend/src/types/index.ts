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
