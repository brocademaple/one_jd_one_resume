import TurndownService from 'turndown';

/** 单例，避免重复创建 */
let turndown: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (!turndown) {
    turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '*',
    });
  }
  return turndown;
}

/**
 * 将选区内的 HTML（如 ReactMarkdown 渲染结果）转为 Markdown，尽量保留标题、列表、加粗、代码等。
 */
export function htmlSelectionToMarkdown(range: Range): string {
  try {
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    const html = container.innerHTML;
    if (!html.trim()) return '';
    return getTurndown().turndown(html).trim();
  } catch {
    return '';
  }
}

export type ChatMessageDomRole = 'assistant' | 'user';

/** 从选区或事件目标向上查找带 data-chat-* 的气泡根节点 */
export function findChatMessageContext(target: Node): { role: ChatMessageDomRole; index: number } | null {
  let el: Node | null = target;
  while (el && el !== document.body) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const e = el as HTMLElement;
      const idx = e.getAttribute('data-chat-msg-index');
      const role = e.getAttribute('data-chat-md-role') as ChatMessageDomRole | null;
      if (idx != null && (role === 'assistant' || role === 'user')) {
        const index = parseInt(idx, 10);
        if (!Number.isNaN(index)) return { role, index };
      }
    }
    el = el.parentNode;
  }
  return null;
}

/** 从 Agent 正文中去掉简历块标记，避免写入面试指导 */
export function stripResumeMarkersFromAgentContent(content: string): string {
  return content
    .replace(/===RESUME_START===[\s\S]*?===RESUME_END===/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
