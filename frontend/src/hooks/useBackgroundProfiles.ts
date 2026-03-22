import { useState, useEffect, useCallback } from 'react';
import type { BackgroundProfile } from '../types';
import {
  extractTextFromFile,
  parseResumePdfForBackground,
  fetchBackgroundProfiles,
  createBackgroundProfile,
  updateBackgroundProfile,
  deleteBackgroundProfile,
} from '../api';
import { LS_ACTIVE_BACKGROUND_PROFILE_ID } from '../utils/resumeDefaultTitle';
import { parseProfileNameFromBackgroundText } from '../utils/parseBackgroundProfileName';
import { pickActiveProfileId } from '../utils/backgroundProfileUtils';

export interface UseBackgroundProfilesOptions {
  /** 弹窗打开时刷新列表 */
  modalOpen: boolean;
}

/**
 * 人物背景档案：列表 / 当前正文 / 持久化；文件导入在独立弹窗中解析，确认后再创建。
 */
export function useBackgroundProfiles({ modalOpen }: UseBackgroundProfilesOptions) {
  const [background, setBackground] = useState('');
  const [profiles, setProfiles] = useState<BackgroundProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [savingBackground, setSavingBackground] = useState(false);
  const [creatingProfileFromText, setCreatingProfileFromText] = useState(false);
  const [backgroundSaved, setBackgroundSaved] = useState(false);

  useEffect(() => {
    fetchBackgroundProfiles()
      .then((list) => {
        setProfiles(list);
        const id = pickActiveProfileId(list, localStorage.getItem(LS_ACTIVE_BACKGROUND_PROFILE_ID));
        if (id != null) {
          localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(id));
          const p = list.find((x) => x.id === id);
          if (p) {
            setActiveProfileId(id);
            setBackground(p.content);
            setEditingName(p.name);
          }
        }
      })
      .catch(() => setBackground(''));
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    setLoadingProfiles(true);
    fetchBackgroundProfiles()
      .then((list) => {
        setProfiles(list);
        const id = pickActiveProfileId(list, localStorage.getItem(LS_ACTIVE_BACKGROUND_PROFILE_ID));
        if (id != null) {
          localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(id));
          const p = list.find((x) => x.id === id);
          if (p) {
            setActiveProfileId(id);
            setBackground(p.content);
            setEditingName(p.name);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfiles(false));
  }, [modalOpen]);

  const handleSelectProfile = useCallback(
    (newId: number) => {
      if (newId === activeProfileId) return;
      localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(newId));
      const p = profiles.find((x) => x.id === newId);
      if (!p) return;
      setActiveProfileId(newId);
      setBackground(p.content);
      setEditingName(p.name);
      setBackgroundSaved(false);
    },
    [activeProfileId, profiles],
  );

  const handleNewProfile = useCallback(async () => {
    try {
      const p = await createBackgroundProfile({ name: '新档案', content: '' });
      const list = await fetchBackgroundProfiles();
      setProfiles(list);
      localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(p.id));
      setActiveProfileId(p.id);
      setBackground(p.content);
      setEditingName(p.name);
      setBackgroundSaved(false);
    } catch {
      alert('新建档案失败');
    }
  }, []);

  const handleDeleteProfile = useCallback(async () => {
    if (activeProfileId == null || profiles.length <= 1) return;
    if (!confirm('确定删除当前人物档案？')) return;
    try {
      await deleteBackgroundProfile(activeProfileId);
      const list = await fetchBackgroundProfiles();
      setProfiles(list);
      const id = pickActiveProfileId(list, localStorage.getItem(LS_ACTIVE_BACKGROUND_PROFILE_ID));
      if (id != null) {
        localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(id));
        const p = list.find((x) => x.id === id);
        if (p) {
          setActiveProfileId(id);
          setBackground(p.content);
          setEditingName(p.name);
        }
      }
      setBackgroundSaved(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : '删除失败');
    }
  }, [activeProfileId, profiles.length]);

  const handleSave = useCallback(async () => {
    if (activeProfileId == null) return;
    setSavingBackground(true);
    setBackgroundSaved(false);
    try {
      const name = editingName.trim();
      const updated = await updateBackgroundProfile(activeProfileId, {
        content: background,
        ...(name ? { name } : {}),
      });
      setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingName(updated.name);
      setBackgroundSaved(true);
      setTimeout(() => setBackgroundSaved(false), 3000);
    } catch {
      alert('保存失败，请重试');
    } finally {
      setSavingBackground(false);
    }
  }, [activeProfileId, editingName, background]);

  /**
   * 仅解析文件，不写库、不改主弹窗编辑区（供「从文件导入」子弹窗使用）
   */
  const parseBackgroundFile = useCallback(async (file: File) => {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const res = isPdf ? await parseResumePdfForBackground(file) : await extractTextFromFile(file);
    if (res.warning) {
      console.warn('[简历背景]', res.warning);
    }
    const baseName = file.name.replace(/\.[^.]+$/i, '').trim();
    const fromBody = parseProfileNameFromBackgroundText(res.text);
    const suggestedName = (fromBody || baseName || '新档案').slice(0, 200);
    return { text: res.text, suggestedName };
  }, []);

  /**
   * 用户于导入弹窗确认后：新建人物并切换为当前
   */
  const createProfileFromImport = useCallback(async (name: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
      alert('正文为空，无法创建档案。');
      throw new Error('empty');
    }
    const finalName = (
      name.trim() ||
      parseProfileNameFromBackgroundText(trimmed) ||
      '新档案'
    ).slice(0, 200);
    setSavingBackground(true);
    setBackgroundSaved(false);
    try {
      const created = await createBackgroundProfile({ name: finalName, content: trimmed });
      const list = await fetchBackgroundProfiles();
      setProfiles(list);
      localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(created.id));
      setActiveProfileId(created.id);
      setBackground(created.content);
      setEditingName(created.name);
      setBackgroundSaved(true);
      setTimeout(() => setBackgroundSaved(false), 4000);
    } catch {
      alert('创建档案失败，请重试。');
      throw new Error('create failed');
    } finally {
      setSavingBackground(false);
    }
  }, []);

  const handleCreateProfileFromParsedText = useCallback(async () => {
    const body = background.trim();
    if (!body) {
      alert('请先在正文中填写人物背景信息。');
      return;
    }
    let displayName = parseProfileNameFromBackgroundText(body);
    if (!displayName) {
      const manual = window.prompt('未能从正文中自动识别「姓名」。请手动输入新人物档案的显示名称：', editingName.trim() || '');
      if (!manual?.trim()) return;
      displayName = manual.trim().slice(0, 200);
    }
    const prevId = activeProfileId;
    const prevName = editingName.trim();
    setCreatingProfileFromText(true);
    try {
      const created = await createBackgroundProfile({ name: displayName, content: body });
      const list = await fetchBackgroundProfiles();
      setProfiles(list);
      localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(created.id));
      setActiveProfileId(created.id);
      setBackground(created.content);
      setEditingName(created.name);
      setBackgroundSaved(true);
      setTimeout(() => setBackgroundSaved(false), 4000);

      const wasTemplate = prevName === '默认' || prevName === '新档案';
      if (prevId != null && prevId !== created.id && wasTemplate) {
        const clear = window.confirm(
          `已新建人物档案「${created.name}」。是否清空原「${prevName}」档案中的正文？（避免与「${created.name}」重复各存一份）`,
        );
        if (clear) {
          const cleared = await updateBackgroundProfile(prevId, { content: '' });
          setProfiles((prev) => prev.map((p) => (p.id === cleared.id ? cleared : p)));
        }
      }
    } catch {
      alert('新建档案失败，请重试。');
    } finally {
      setCreatingProfileFromText(false);
    }
  }, [background, activeProfileId, editingName]);

  const markEditorDirty = useCallback(() => setBackgroundSaved(false), []);

  return {
    backgroundForChat: background,
    profiles,
    activeProfileId,
    editingName,
    background,
    setBackground,
    setEditingName,
    loadingProfiles,
    savingBackground,
    creatingProfileFromText,
    backgroundSaved,
    parseBackgroundFile,
    createProfileFromImport,
    handleSelectProfile,
    handleNewProfile,
    handleDeleteProfile,
    handleSave,
    handleCreateProfileFromParsedText,
    markEditorDirty,
  };
}

export type BackgroundProfilesController = ReturnType<typeof useBackgroundProfiles>;

export function getBackgroundBarLabel(
  bg: Pick<BackgroundProfilesController, 'profiles' | 'activeProfileId' | 'editingName'>,
): string {
  const p = bg.profiles.find((x) => x.id === bg.activeProfileId);
  const name = (p?.name || bg.editingName || '').trim();
  if (!name && bg.profiles.length === 0) return '加载中…';
  return name || '未选择';
}
