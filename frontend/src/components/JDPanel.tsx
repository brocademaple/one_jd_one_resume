import { useState } from 'react';
import { Briefcase, Edit3, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Job } from '../types';
import { updateJob } from '../api';

interface JDPanelProps {
  job: Job | null;
  onJobUpdated: (job: Job) => void;
}

export function JDPanel({ job, onJobUpdated }: JDPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!job) return;
    setEditTitle(job.title);
    setEditCompany(job.company || '');
    setEditContent(job.content);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!job) return;
    setSaving(true);
    try {
      const updated = await updateJob(job.id, {
        title: editTitle,
        company: editCompany,
        content: editContent,
      });
      onJobUpdated(updated);
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!job) {
    return (
      <div className="flex flex-col h-full bg-white border-r border-gray-200">
        <div className="panel-header">
          <span className="panel-title">
            <Briefcase size={16} className="text-primary-500" />
            岗位JD
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">从左侧选择岗位</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title flex-1 min-w-0">
          <Briefcase size={16} className="text-primary-500 flex-shrink-0" />
          {editing ? (
            <div className="flex-1 flex gap-2 items-center min-w-0">
              <input
                className="flex-1 border-b border-primary-400 outline-none text-sm font-semibold text-gray-800 bg-transparent min-w-0"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="岗位名称"
              />
              <input
                className="w-28 border-b border-gray-300 outline-none text-xs text-gray-500 bg-transparent"
                value={editCompany}
                onChange={e => setEditCompany(e.target.value)}
                placeholder="公司"
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <span className="truncate block">{job.title}</span>
              {job.company && <span className="text-xs text-gray-400 font-normal">{job.company}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {editing ? (
            <>
              <button
                className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 text-xs px-3 disabled:opacity-50"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '保存中' : <><Save size={13} className="inline mr-1" />保存</>}
              </button>
              <button
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                onClick={() => setEditing(false)}
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <button
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary-600"
              onClick={startEdit}
              title="编辑JD"
            >
              <Edit3 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {editing ? (
          <textarea
            className="w-full h-full p-4 text-sm text-gray-700 outline-none resize-none font-mono leading-relaxed"
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="岗位描述内容..."
          />
        ) : (
          <div className="p-4 markdown-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {job.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
