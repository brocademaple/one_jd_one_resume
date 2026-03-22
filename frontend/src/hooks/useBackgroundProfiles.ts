import { useState, useEffect, useCallback, useRef } from 'react';
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

/** 文件导入预览前，当前档案在内存中的快照（用于放弃导入时恢复） */
export type ImportDraftSnapshot = {
  background: string;
  editingName: string;
  activeProfileId: number | null;
};

export interface UseBackgroundProfilesOptions {
  /** 弹窗打开时刷新列表 */
  modalOpen: boolean;
}

/**
 * 人物背景档案：列表 / 当前正文 / 持久化 / 上传合并入库（逻辑与 UI 分离，供 ChatPanel 使用）
 */
export function useBackgroundProfiles({ modalOpen }: UseBackgroundProfilesOptions) {
  const [background, setBackground] = useState('');
  const [profiles, setProfiles] = useState<BackgroundProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [savingBackground, setSavingBackground] = useState(false);
  const [creatingProfileFromText, setCreatingProfileFromText] = useState(false);
  const [backgroundSaved, setBackgroundSaved] = useState(false);
  /** 非 null 表示正在预览「待创建」的新档案（尚未 POST 创建） */
  const [importDraftSnapshot, setImportDraftSnapshot] = useState<ImportDraftSnapshot | null>(null);
  const importDraftRef = useRef<ImportDraftSnapshot | null>(null);
  useEffect(() => {
    importDraftRef.current = importDraftSnapshot;
  }, [importDraftSnapshot]);

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

  /** 放弃导入预览并恢复导入前编辑区；返回被恢复的快照（供紧接着再次导入时使用同步值） */
  const abandonImportDraft = useCallback((): ImportDraftSnapshot | null => {
    const snap = importDraftRef.current;
    setImportDraftSnapshot(null);
    importDraftRef.current = null;
    if (snap) {
      setBackground(snap.background);
      setEditingName(snap.editingName);
      setActiveProfileId(snap.activeProfileId);
      if (snap.activeProfileId != null) {
        localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(snap.activeProfileId));
      }
      setBackgroundSaved(false);
      return snap;
    }
    return null;
  }, []);

  const handleSelectProfile = useCallback(
    (newId: number) => {
      if (newId === activeProfileId) return;
      if (importDraftRef.current) {
        if (!window.confirm('当前有未保存的文件导入预览，切换人物将放弃预览并恢复导入前的内容，是否继续？')) {
          return;
        }
        abandonImportDraft();
      }
      localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(newId));
      const p = profiles.find((x) => x.id === newId);
      if (!p) return;
      setActiveProfileId(newId);
      setBackground(p.content);
      setEditingName(p.name);
      setBackgroundSaved(false);
    },
    [activeProfileId, profiles, abandonImportDraft],
  );

  const handleNewProfile = useCallback(async () => {
    if (importDraftRef.current) {
      if (!window.confirm('当前有未保存的文件导入预览，新建档案将放弃预览并恢复导入前的内容，是否继续？')) {
        return;
      }
      abandonImportDraft();
    }
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
  }, [abandonImportDraft]);

  const handleDeleteProfile = useCallback(async () => {
    if (importDraftRef.current) {
      if (!window.confirm('当前有未保存的文件导入预览，删除档案将先放弃预览，是否继续？')) return;
      abandonImportDraft();
    }
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
  }, [activeProfileId, profiles.length, abandonImportDraft]);

  const handleSave = useCallback(async () => {
    if (importDraftSnapshot) {
      alert('当前处于「导入预览」：请使用「确认保存为新档案」创建档案，或点「放弃导入」。');
      return;
    }
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
  }, [activeProfileId, editingName, background, importDraftSnapshot]);

  /** 将导入预览正式创建为新人物档案 */
  const commitImportDraft = useCallback(async () => {
    if (!importDraftSnapshot) return;
    const content = background.trim();
    if (!content) {
      alert('正文为空，无法创建档案。');
      return;
    }
    const name = (
      editingName.trim() ||
      parseProfileNameFromBackgroundText(content) ||
      '新档案'
    ).slice(0, 200);
    setSavingBackground(true);
    setBackgroundSaved(false);
    try {
      const created = await createBackgroundProfile({ name, content });
      const list = await fetchBackgroundProfiles();
      setProfiles(list);
      localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(created.id));
      setActiveProfileId(created.id);
      setBackground(created.content);
      setEditingName(created.name);
      setImportDraftSnapshot(null);
      importDraftRef.current = null;
      setBackgroundSaved(true);
      setTimeout(() => setBackgroundSaved(false), 4000);
    } catch {
      alert('创建档案失败，请重试。');
    } finally {
      setSavingBackground(false);
    }
  }, [importDraftSnapshot, background, editingName]);

  /** 上传文件：仅解析并进入「待创建新档案」预览，不写入数据库 */
  const handleFileImport = useCallback(
    async (file: File) => {
      let baseBg = background;
      let baseEn = editingName;
      let basePid = activeProfileId;

      if (importDraftRef.current) {
        if (!window.confirm('将放弃当前导入预览并开始新的解析，是否继续？')) return;
        const restored = abandonImportDraft();
        if (restored) {
          baseBg = restored.background;
          baseEn = restored.editingName;
          basePid = restored.activeProfileId;
        }
      }

      setUploadingBg(true);
      try {
        if (basePid == null) {
          const list = await fetchBackgroundProfiles();
          setProfiles(list);
          const picked = pickActiveProfileId(list, localStorage.getItem(LS_ACTIVE_BACKGROUND_PROFILE_ID));
          if (picked != null) {
            localStorage.setItem(LS_ACTIVE_BACKGROUND_PROFILE_ID, String(picked));
            const p = list.find((x) => x.id === picked);
            if (p) {
              basePid = picked;
              baseBg = p.content;
              baseEn = p.name;
              setActiveProfileId(picked);
              setBackground(p.content);
              setEditingName(p.name);
            }
          }
        }
        if (basePid == null) {
          alert('请先点击「新建」创建一条人物档案，或刷新后重试。');
          return;
        }

        const snap: ImportDraftSnapshot = {
          background: baseBg,
          editingName: baseEn,
          activeProfileId: basePid,
        };
        importDraftRef.current = snap;
        setImportDraftSnapshot(snap);

        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        const res = isPdf ? await parseResumePdfForBackground(file) : await extractTextFromFile(file);
        if (res.warning) {
          console.warn('[简历背景]', res.warning);
        }
        const baseName = file.name.replace(/\.[^.]+$/i, '').trim();
        const fromBody = parseProfileNameFromBackgroundText(res.text);
        const suggested = (fromBody || baseName || '新档案').slice(0, 200);

        setBackground(res.text);
        setEditingName(suggested);
        setBackgroundSaved(false);
      } catch (e) {
        setImportDraftSnapshot(null);
        importDraftRef.current = null;
        alert(e instanceof Error ? e.message : '背景文件解析失败，请检查文件编码、通义 API Key、OCR 配置或文件格式。');
      } finally {
        setUploadingBg(false);
      }
    },
    [activeProfileId, editingName, background, abandonImportDraft],
  );

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

  /** 预览待创建档案时，对话仍使用导入前的档案正文 */
  const backgroundForChat = importDraftSnapshot ? importDraftSnapshot.background : background;

  return {
    backgroundForChat,
    profiles,
    activeProfileId,
    editingName,
    background,
    setBackground,
    setEditingName,
    loadingProfiles,
    uploadingBg,
    savingBackground,
    creatingProfileFromText,
    backgroundSaved,
    importDraftSnapshot,
    abandonImportDraft,
    commitImportDraft,
    handleSelectProfile,
    handleNewProfile,
    handleDeleteProfile,
    handleSave,
    handleFileImport,
    handleCreateProfileFromParsedText,
    markEditorDirty,
  };
}

export type BackgroundProfilesController = ReturnType<typeof useBackgroundProfiles>;

/** 顶部状态栏展示的当前人物背景名称（含导入预览提示） */
export function getBackgroundBarLabel(
  bg: Pick<BackgroundProfilesController, 'importDraftSnapshot' | 'profiles' | 'activeProfileId' | 'editingName'>,
): string {
  if (bg.importDraftSnapshot) {
    const n = bg.editingName.trim() || '新档案';
    return `${n}（预览）`;
  }
  const p = bg.profiles.find((x) => x.id === bg.activeProfileId);
  const name = (p?.name || bg.editingName || '').trim();
  if (!name && bg.profiles.length === 0) return '加载中…';
  return name || '未选择';
}
