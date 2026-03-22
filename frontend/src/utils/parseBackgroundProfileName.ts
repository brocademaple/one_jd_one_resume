/**
 * 从「我的背景」正文前部识别人物显示名（姓名 / 名字 等常见写法）
 */
function cleanNameCandidate(raw: string): string | null {
  let s = raw.replace(/\*\*/g, '').replace(/^\*+\s*/, '').replace(/^[#>\s\-•\d.]+/, '').trim();
  s = s.split(/[|｜]/)[0]?.trim() ?? '';
  // 去掉末尾英文括号说明，如「陈思远 (Chen Siyuan)」→ 陈思远
  s = s.replace(/\s*[(（][^)）]*[)）]\s*$/, '').trim();
  // 中文名 2–20 字；或常见英文名
  if (/^[\u4e00-\u9fa5·．\s]{2,20}$/.test(s)) {
    const t = s.replace(/\s+/g, '').replace(/．/g, '·');
    return t.slice(0, 200);
  }
  if (/^[a-zA-Z][a-zA-Z\s.\-]{1,40}$/.test(s)) {
    return s.trim().slice(0, 200);
  }
  return null;
}

export function parseProfileNameFromBackgroundText(text: string): string | null {
  const head = text.slice(0, 8000);
  const patterns: RegExp[] = [
    // 姓名 (Name): 陈思远 ；支持 **姓名**：陈思远
    /\*?\*?姓名\*?\*?\s*(?:\([^)]*\))?\s*[:：]\s*([^\n\r|｜]+)/,
    /名字\s*[:：]\s*([^\n\r|｜]+)/,
    /\*\*姓名\*\*\s*[:：]?\s*([^\n\r|｜]+)/,
    /(?:^|[\n\r])[*•\-\d.\s]*\*?\*?姓名\*?\*?\s*[:：]\s*([^\n\r|｜]+)/im,
    /Name\s*[:：]\s*([^\n\r|｜]+)/i,
  ];
  for (const re of patterns) {
    const m = head.match(re);
    if (m?.[1]) {
      const name = cleanNameCandidate(m[1]);
      if (name) return name;
    }
  }
  return null;
}
