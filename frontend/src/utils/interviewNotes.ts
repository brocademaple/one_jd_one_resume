/** 面试指导：按岗位存一份 Markdown 文档（与定制简历同级的文档结构） */

import type { InterviewNote } from '../types';

const NOTES_PREFIX = 'interview_notes_job_'; // 旧：多条摘录
const GUIDE_PREFIX = 'interview_guide_job_'; // 新：单篇 Markdown
const GUIDE_TITLE_PREFIX = 'interview_guide_title_job_'; // 面试指导显示名称
const DEFAULT_GUIDE_TITLE = '面试指导';

/** 从旧格式（多条摘录）迁移并返回当前 Markdown 内容 */
export function getInterviewGuideContent(jobId: number): string {
  try {
    const newRaw = localStorage.getItem(GUIDE_PREFIX + jobId);
    if (newRaw != null) return newRaw;

    const oldRaw = localStorage.getItem(NOTES_PREFIX + jobId);
    if (!oldRaw) return '';

    const list = JSON.parse(oldRaw);
    if (!Array.isArray(list) || list.length === 0) return '';

    const parts: string[] = [];
    list.forEach((n: { content?: string }, i: number) => {
      if (n?.content) parts.push(`## 摘录 ${i + 1}\n\n${n.content.trim()}`);
    });
    const migrated = parts.join('\n\n---\n\n');
    localStorage.setItem(GUIDE_PREFIX + jobId, migrated);
    return migrated;
  } catch {
    return '';
  }
}

export function saveInterviewGuideContent(jobId: number, content: string): void {
  localStorage.setItem(GUIDE_PREFIX + jobId, content);
}

export function getInterviewGuideTitle(jobId: number): string {
  try {
    const t = localStorage.getItem(GUIDE_TITLE_PREFIX + jobId);
    return (t && t.trim()) ? t.trim() : DEFAULT_GUIDE_TITLE;
  } catch {
    return DEFAULT_GUIDE_TITLE;
  }
}

export function saveInterviewGuideTitle(jobId: number, title: string): void {
  const t = title.trim();
  if (t) localStorage.setItem(GUIDE_TITLE_PREFIX + jobId, t);
  else localStorage.removeItem(GUIDE_TITLE_PREFIX + jobId);
}

/** 清空该岗位的面试指导内容与自定义标题 */
export function clearInterviewGuide(jobId: number): void {
  localStorage.removeItem(GUIDE_PREFIX + jobId);
  localStorage.removeItem(GUIDE_TITLE_PREFIX + jobId);
}

/** 追加内容到面试指导文档末尾（用于从对话/选中添加） */
export function appendToInterviewGuide(jobId: number, text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const current = getInterviewGuideContent(jobId);
  const sep = current ? '\n\n---\n\n' : '';
  const withDate = `## 摘录 · ${new Date().toLocaleString('zh-CN')}\n\n${trimmed}`;
  saveInterviewGuideContent(jobId, current + sep + withDate);
}

// 兼容旧调用：ChatPanel 等仍可能用 addInterviewNote，改为追加到单篇文档
export function getInterviewNotes(_jobId: number): InterviewNote[] {
  return [];
}

export function addInterviewNote(jobId: number, content: string): InterviewNote {
  appendToInterviewGuide(jobId, content);
  return { id: '', content, created_at: Date.now() };
}

export function removeInterviewNote(_jobId: number, _noteId: string): void {
  // 单篇文档模式下不再按条删除；用户可在编辑时自行删减
}
