import { useState, useEffect, useRef } from 'react';
import { BookOpen, Edit3, Save, X, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getInterviewGuideContent, saveInterviewGuideContent, getInterviewGuideTitle } from '../utils/interviewNotes';
import {
  fetchJobInterviewBankMeta,
} from '../api';
import { handleApiError, showSuccess, showInfo } from '../utils/errorHandler';
import { InterviewQuestionBankModal } from './InterviewQuestionBankModal';

interface InterviewGuidePanelProps {
  jobId: number | null;
  /** 外部追加内容后递增，用于刷新 */
  refreshKey?: number;
  resumeId: number | null;
  backgroundProfileId: number | null;
  /** 当前岗位是否已选中对应简历（允许开始模拟） */
  canStartSimulation?: boolean;
  onStartInterviewSim?: (preferredCategories: string[] | null) => void;
}

export function InterviewGuidePanel({
  jobId,
  refreshKey = 0,
  resumeId,
  backgroundProfileId,
  canStartSimulation = false,
  onStartInterviewSim,
}: InterviewGuidePanelProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [jobBankCount, setJobBankCount] = useState(0);
  const [questionBankOpen, setQuestionBankOpen] = useState(false);

  const loadJobBankMeta = async (jid: number) => {
    if (resumeId == null || backgroundProfileId == null) {
      setJobBankCount(0);
      return;
    }
    try {
      const { count } = await fetchJobInterviewBankMeta({
        jobId: jid,
        resumeId,
        backgroundProfileId,
      });
      setJobBankCount(count);
    } catch {
      setJobBankCount(0);
    }
  };

  useEffect(() => {
    if (jobId == null) {
      setContent('');
      setTitle('');
      setJobBankCount(0);
      return;
    }
    setContent(getInterviewGuideContent(jobId));
    setTitle(getInterviewGuideTitle(jobId));
    void loadJobBankMeta(jobId);
  }, [jobId, refreshKey, resumeId, backgroundProfileId]);

  const startEdit = () => {
    setEditContent(content);
    setEditing(true);
  };

  const handleSave = () => {
    if (jobId == null) return;
    setSaving(true);
    saveInterviewGuideContent(jobId, editContent);
    setContent(editContent);
    setEditing(false);
    setSaving(false);
  };

  const handleClear = () => {
    if (jobId == null) return;
    if (!content.trim()) return;
    if (!confirm('确定清空当前岗位的面试指导内容？此操作不可恢复。')) return;
    saveInterviewGuideContent(jobId, '');
    setContent('');
    setEditContent('');
    setEditing(false);
  };

  if (jobId == null) {
    return (
      <div className="flex flex-col h-full bg-amber-50/50 border-t border-amber-100">
        <div className="panel-header flex-shrink-0">
          <span className="panel-title">
            <BookOpen size={14} className="text-amber-500" />
            面试指导
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          请先选择岗位，或从对话中「收藏到面试指导」添加内容
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-amber-50/50 border-t border-amber-100 min-h-0">
      {jobId != null && (
        <InterviewQuestionBankModal
          open={questionBankOpen}
          onClose={() => {
            setQuestionBankOpen(false);
            void loadJobBankMeta(jobId);
          }}
          jobId={jobId}
          jobTitle={title || '面试指导'}
          canStartSimulation={canStartSimulation}
            resumeId={resumeId}
          backgroundProfileId={backgroundProfileId}
          onStartSimulation={(preferredCategories) => {
            onStartInterviewSim?.(preferredCategories);
            setQuestionBankOpen(false);
          }}
        />
      )}

      <div className="panel-header flex-wrap sm:flex-nowrap items-start sm:items-center">
        <div className="flex-1 min-w-0">
          <div className="panel-title">
            <BookOpen size={14} className="text-amber-500 flex-shrink-0" />
            <span className="truncate">{title || '面试指导'}</span>
          </div>
          <p
            className="text-[10px] leading-tight text-amber-800/70 font-normal pl-5 truncate"
            title="面试准备中心：题库生成/预览/编辑/类型选择/开始模拟"
          >
            题库 {jobBankCount} 题 · 「面试准备」可模拟
          </p>
        </div>
        <div className="flex flex-wrap gap-1 flex-shrink-0">
          <button
            type="button"
            className="px-2 py-1 rounded-md text-xs text-amber-800 hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1"
            title="打开面试准备中心"
            onClick={() => setQuestionBankOpen(true)}
          >
            <Sparkles size={12} className="opacity-70" />
            面试准备
          </button>
          {editing ? (
            <>
              <button
                type="button"
                className="px-2 py-1 rounded-md bg-primary-600 text-white hover:bg-primary-700 text-xs disabled:opacity-50 flex items-center gap-1"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '保存中' : <><Save size={12} />保存</>}
              </button>
              <button
                type="button"
                className="px-2 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                onClick={() => {
                  setEditing(false);
                  setEditContent(content);
                }}
              >
                <X size={12} />
                取消
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="px-2 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-100 hover:text-amber-600 flex items-center gap-1"
                onClick={startEdit}
                title="编辑面试指导"
              >
                <Edit3 size={12} />
                编辑
              </button>
              {content.trim() && (
                <button
                  type="button"
                  className="px-2 py-1 rounded-md text-xs text-gray-600 hover:bg-gray-100 hover:text-red-500 flex items-center gap-1"
                  onClick={handleClear}
                  title="清空内容"
                >
                  <Trash2 size={12} />
                  清空
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {editing ? (
          <textarea
            className="w-full h-full p-3 text-[13px] text-gray-700 outline-none resize-none font-mono leading-snug"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="在此编辑 Markdown；从 Agent 对话右键或书签图标追加的内容会尽量保留 Markdown 结构..."
          />
        ) : (
          <div className="px-3 py-2 markdown-content bg-white/80 min-h-full">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p className="text-gray-500 text-xs leading-snug">暂无内容。在助手消息中选中文本后右键「添加到面试指导」，或悬停助手气泡点击书签图标。</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
