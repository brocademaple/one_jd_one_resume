import { Job, Resume, Message, SettingsResponse, CurrentProvider } from '../types';

const BASE_URL = '/api';

// Jobs
export const fetchJobs = async (): Promise<Job[]> => {
  const res = await fetch(`${BASE_URL}/jobs`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
};

export const createJob = async (data: { title: string; company?: string; content: string }): Promise<Job> => {
  const res = await fetch(`${BASE_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create job');
  return res.json();
};

export const updateJob = async (id: number, data: Partial<Job>): Promise<Job> => {
  const res = await fetch(`${BASE_URL}/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update job');
  return res.json();
};

export const deleteJob = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE_URL}/jobs/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete job');
};

// Resumes
export const fetchResumes = async (jobId?: number): Promise<Resume[]> => {
  const url = jobId ? `${BASE_URL}/resumes?job_id=${jobId}` : `${BASE_URL}/resumes`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch resumes');
  return res.json();
};

export const createResume = async (data: { job_id: number; title?: string; content: string }): Promise<Resume> => {
  const res = await fetch(`${BASE_URL}/resumes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create resume');
  return res.json();
};

export const updateResume = async (id: number, data: { title?: string; content?: string }): Promise<Resume> => {
  const res = await fetch(`${BASE_URL}/resumes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update resume');
  return res.json();
};

export const deleteResume = async (id: number): Promise<void> => {
  const res = await fetch(`${BASE_URL}/resumes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete resume');
};

// Chat streaming
export const streamChat = async (
  jobId: number,
  resumeId: number,
  messages: Message[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  userBackground?: string,
): Promise<void> => {
  try {
    const res = await fetch(`${BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        resume_id: resumeId,
        messages,
        user_background: userBackground,
      }),
    });

    if (!res.ok) throw new Error('Chat request failed');

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              onChunk(data.content);
            } else if (data.type === 'done') {
              onDone();
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
};

// Export
export const getExportPdfUrl = (resumeId: number) =>
  `${BASE_URL}/export/pdf/${resumeId}`;

export const getExportMarkdownUrl = (resumeId: number) =>
  `${BASE_URL}/export/markdown/${resumeId}`;

export const getExportWordUrl = (resumeId: number) =>
  `${BASE_URL}/export/word/${resumeId}`;

export const getPreviewPdfUrl = (resumeId: number) =>
  `${BASE_URL}/export/pdf-preview/${resumeId}`;

export const extractTextFromFile = async (file: File): Promise<{filename: string; text: string; parser: string}> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/uploads/extract`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('文件解析失败');
  return res.json();
};

export const parseJobFromFile = async (file: File): Promise<{title: string; company?: string; content: string}> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE_URL}/uploads/parse-job`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('JD解析失败');
  return res.json();
};

// Settings
export const fetchSettings = async (): Promise<SettingsResponse> => {
  const res = await fetch(`${BASE_URL}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
};

export const updateSettings = async (data: {
  provider: string;
  model: string;
  api_keys?: Record<string, string>;
}): Promise<void> => {
  const res = await fetch(`${BASE_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save settings');
};

export const clearApiKey = async (provider: string): Promise<void> => {
  const res = await fetch(`${BASE_URL}/settings/api-key/${provider}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear API key');
};

export const fetchCurrentProvider = async (): Promise<CurrentProvider> => {
  const res = await fetch(`${BASE_URL}/chat/current-provider`);
  if (!res.ok) throw new Error('Failed to fetch provider info');
  return res.json();
};
