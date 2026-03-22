/** 与 ChatPanel 中 localStorage 键一致 */
export const LS_ACTIVE_BACKGROUND_PROFILE_ID = 'active_background_profile_id';

/** 用于简历标题/导出文件名片段：去掉非法文件名字符 */
export function sanitizeTitlePart(s: string, fallback: string): string {
  const t = s.replace(/[<>:"/\\|?*\n\r\t]/g, '').replace(/\s+/g, ' ').trim();
  return t || fallback;
}

/**
 * 默认简历显示名：JD 名称 + 当前人物背景档案显示名
 */
export function composeResumeTitleFromParts(
  jobTitle: string | null | undefined,
  profileName: string | null | undefined,
): string {
  const j = sanitizeTitlePart(jobTitle ?? '', '岗位');
  const n = sanitizeTitlePart(profileName ?? '', '背景');
  return `${j}${n}`;
}

function pickActiveProfileIdFromList(
  list: { id: number; name: string }[],
  storedRaw: string | null,
): number | null {
  if (list.length === 0) return null;
  const stored = storedRaw ? parseInt(storedRaw, 10) : NaN;
  if (Number.isFinite(stored) && list.some((p) => p.id === stored)) return stored;
  return list[0].id;
}

/** 侧边栏「新建简历」等场景：按当前选中的背景档案拉取并组合标题 */
export async function fetchDefaultResumeTitle(jobTitle: string | null | undefined): Promise<string> {
  const j = sanitizeTitlePart(jobTitle ?? '', '岗位');
  try {
    const { fetchBackgroundProfiles } = await import('../api');
    const list = await fetchBackgroundProfiles();
    if (list.length === 0) return `${j}背景`;
    const id = pickActiveProfileIdFromList(list, localStorage.getItem(LS_ACTIVE_BACKGROUND_PROFILE_ID));
    const p = id != null ? list.find((x) => x.id === id) : list[0];
    const n = sanitizeTitlePart(p?.name ?? '', '背景');
    return `${j}${n}`;
  } catch {
    return `${j}简历`;
  }
}
