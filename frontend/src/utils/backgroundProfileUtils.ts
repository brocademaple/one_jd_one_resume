import type { BackgroundProfile } from '../types';

export function pickActiveProfileId(list: BackgroundProfile[], storedRaw: string | null): number | null {
  if (list.length === 0) return null;
  const stored = storedRaw ? parseInt(storedRaw, 10) : NaN;
  if (Number.isFinite(stored) && list.some((p) => p.id === stored)) return stored;
  return list[0].id;
}

export function mergeBackgroundContent(previous: string, extracted: string): string {
  return `${previous}\n\n${extracted}`.trim();
}

/** 上传合并后是否用文件名作为档案显示名 */
export function shouldUseFilenameAsProfileName(
  currentDisplayName: string,
  fileBaseName: string,
): { useFileName: boolean; name?: string } {
  const trimmed = fileBaseName.trim();
  if (!trimmed || trimmed.length > 200) return { useFileName: false };
  const generic = /^(默认|新档案)$/u.test(currentDisplayName.trim());
  return generic ? { useFileName: true, name: trimmed } : { useFileName: false };
}
