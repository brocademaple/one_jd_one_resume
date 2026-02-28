import { Job, Resume, Message, SettingsResponse, CurrentProvider } from '../types';

const BASE_URL = '/api';

// Jobs
export const fetchJobs = async (): Promise<Job[]> => {
  const res = await fetch(`${BASE_URL}/jobs`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  return res.json();
};

export const createJob = async (data: { title: string; company?: string; job_url?: string; salary?: string; content: string; status?: string }): Promise<Job> => {
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
export interface ExportOptions {
  fontSize: number;
  marginCm: number;
}

export const getExportPdfUrl = (resumeId: number, options?: ExportOptions) => {
  const u = `${BASE_URL}/export/pdf/${resumeId}`;
  if (!options) return u;
  const p = new URLSearchParams();
  p.set('font_size', String(options.fontSize));
  p.set('margin_cm', String(options.marginCm));
  return `${u}?${p}`;
};

export const getExportWordUrl = (resumeId: number, options?: ExportOptions) => {
  const u = `${BASE_URL}/export/word/${resumeId}`;
  if (!options) return u;
  const p = new URLSearchParams();
  p.set('font_size', String(options.fontSize));
  p.set('margin_cm', String(options.marginCm));
  return `${u}?${p}`;
};

export const getPreviewPdfUrl = (resumeId: number, options?: ExportOptions) => {
  const u = `${BASE_URL}/export/pdf-preview/${resumeId}`;
  if (!options) return u;
  const p = new URLSearchParams();
  p.set('font_size', String(options.fontSize));
  p.set('margin_cm', String(options.marginCm));
  return `${u}?${p}`;
};

export const getExportMarkdownUrl = (resumeId: number) =>
  `${BASE_URL}/export/markdown/${resumeId}`;

/** Fetch export blob and trigger save-as (user chooses path via browser save dialog). */
export async function downloadResumeWithOptions(
  format: 'pdf' | 'word',
  resumeId: number,
  options: ExportOptions,
  suggestedFilename: string
): Promise<void> {
  const url = format === 'pdf' ? getExportPdfUrl(resumeId, options) : getExportWordUrl(resumeId, options);
  const res = await fetch(url);
  if (!res.ok) throw new Error(format === 'pdf' ? '导出 PDF 失败' : '导出 Word 失败');
  const blob = await res.blob();
  const ext = format === 'pdf' ? 'pdf' : 'docx';
  const name = suggestedFilename.replace(/\.[^.]+$/, '') + '.' + ext;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Legacy: direct download without options (for backward compat). */
export async function downloadResumePdf(resumeId: number): Promise<string> {
  await downloadResumeWithOptions('pdf', resumeId, { fontSize: 10, marginCm: 2 }, `resume_${resumeId}`);
  return `resume_${resumeId}.pdf`;
}

export async function downloadResumeWord(resumeId: number): Promise<string> {
  await downloadResumeWithOptions('word', resumeId, { fontSize: 11, marginCm: 2 }, `resume_${resumeId}`);
  return `resume_${resumeId}.docx`;
}

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
  if (!res.ok) throw new Error('岗位信息解析失败');
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

export const testConnection = async (provider: string, model: string, apiKey?: string): Promise<{ success: boolean; message: string }> => {
  const res = await fetch(`${BASE_URL}/settings/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, model, api_key: apiKey || undefined }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || '测试失败');
  return data;
};

export const fetchCurrentProvider = async (): Promise<CurrentProvider> => {
  const res = await fetch(`${BASE_URL}/chat/current-provider`);
  if (!res.ok) throw new Error('Failed to fetch provider info');
  return res.json();
};

// Conversations (per resume)
export const fetchConversation = async (resumeId: number): Promise<{ resume_id: number; messages: Message[] }> => {
  const res = await fetch(`${BASE_URL}/chat/conversations/${resumeId}`);
  if (!res.ok) throw new Error('Failed to fetch conversation');
  const data = await res.json();
  return { resume_id: data.resume_id, messages: data.messages || [] };
};

export const saveConversation = async (resumeId: number, messages: Message[]): Promise<void> => {
  const res = await fetch(`${BASE_URL}/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resume_id: resumeId,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error('Failed to save conversation');
};

// User Background
export const fetchUserBackground = async (): Promise<import('../types').UserBackground> => {
  const res = await fetch(`${BASE_URL}/background`);
  if (!res.ok) throw new Error('Failed to fetch user background');
  return res.json();
};

export const updateUserBackground = async (content: string): Promise<import('../types').UserBackground> => {
  const res = await fetch(`${BASE_URL}/background`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update user background');
  return res.json();
};
