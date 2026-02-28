import { useState, useEffect } from 'react';
import { BookOpen, Edit3, Save, X, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getInterviewGuideContent, saveInterviewGuideContent, getInterviewGuideTitle } from '../utils/interviewNotes';

interface InterviewGuidePanelProps {
  jobId: number | null;
  /** 外部追加内容后递增，用于刷新 */
  refreshKey?: number;
}

export function InterviewGuidePanel({ jobId, refreshKey = 0 }: InterviewGuidePanelProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (jobId == null) {
      setContent('');
      setTitle('');
      return;
    }
    setContent(getInterviewGuideContent(jobId));
    setTitle(getInterviewGuideTitle(jobId));
  }, [jobId, refreshKey]);

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
            <BookOpen size={16} className="text-amber-500" />
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
    <div className="flex flex-col h-full bg-amber-50/50 border-t border-amber-100 min-h-0">
      <div className="panel-header flex-shrink-0">
        <div className="panel-title flex-1 min-w-0">
          <BookOpen size={16} className="text-amber-500 flex-shrink-0" />
          <span className="truncate">{title || '面试指导'}</span>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {editing ? (
            <>
              <button
                type="button"
                className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 text-xs px-3 disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '保存中' : <><Save size={13} className="inline mr-1" />保存</>}
              </button>
              <button type="button" className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" onClick={() => { setEditing(false); setEditContent(content); }}>
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-amber-600"
                onClick={startEdit}
                title="编辑面试指导"
              >
                <Edit3 size={14} />
              </button>
              {content.trim() && (
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-500"
                  onClick={handleClear}
                  title="清空内容"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {editing ? (
          <textarea
            className="w-full h-full p-4 text-sm text-gray-700 outline-none resize-none font-mono leading-relaxed"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="在此编辑 Markdown 内容，或从右侧对话中「收藏到面试指导」追加..."
          />
        ) : (
          <div className="p-4 markdown-content bg-white/80 min-h-full">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p className="text-gray-500 text-sm">暂无内容。可从右侧对话中选中文字右键「添加到面试指导中」，或点击助手消息下的「收藏到面试指导」。</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
