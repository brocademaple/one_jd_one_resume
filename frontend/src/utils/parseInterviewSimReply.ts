const REACTION_TAG = '<<<REACTION>>>';
const SPEECH_TAG = '<<<SPEECH>>>';

/** 解析面试官流式回复中的「现场反应」与「发言」区块 */
export function parseInterviewSimReply(raw: string): { reaction: string; speech: string } {
  const trimmed = raw.trim();
  const rIdx = trimmed.indexOf(REACTION_TAG);
  const sIdx = trimmed.indexOf(SPEECH_TAG);
  if (rIdx !== -1 && sIdx !== -1 && sIdx > rIdx) {
    const reaction = trimmed.slice(rIdx + REACTION_TAG.length, sIdx).trim();
    const speech = trimmed.slice(sIdx + SPEECH_TAG.length).trim();
    return { reaction, speech };
  }
  return { reaction: '', speech: trimmed };
}

export function interviewSimMessageForReport(role: 'user' | 'assistant', content: string, reaction?: string, speech?: string): string {
  if (role === 'user') return content;
  if (reaction && speech) {
    return `[现场反应]\n${reaction}\n\n[面试官发言]\n${speech}`;
  }
  return content;
}
