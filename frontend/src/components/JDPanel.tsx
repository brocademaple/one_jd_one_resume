import { useState } from 'react';
import { Briefcase, Edit3, Save, X, Link2, DollarSign } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Job, JOB_STATUS_OPTIONS } from '../types';
import { updateJob } from '../api';
import { getStatusConfig } from '../utils/jobStatus';

interface JDPanelProps {
  job: Job | null;
  onJobUpdated: (job: Job) => void;
}

export function JDPanel({ job, onJobUpdated }: JDPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editJobUrl, setEditJobUrl] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    if (!job) return;
    setEditTitle(job.title);
    setEditCompany(job.company || '');
    setEditJobUrl(job.job_url || '');
    setEditSalary(job.salary || '');
    setEditStatus(job.status || 'pending');
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
        job_url: editJobUrl.trim() || undefined,
        salary: editSalary.trim() || undefined,
        status: editStatus,
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
            岗位信息
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

  const statusCfg = getStatusConfig(editing ? editStatus : job.status);
  const StatusIcon = statusCfg.icon;

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title flex-1 min-w-0">
          <Briefcase size={16} className="text-primary-500 flex-shrink-0" />
          {editing ? (
            <div className="flex-1 flex flex-wrap gap-2 items-center min-w-0">
              <input
                className="flex-1 min-w-[120px] border-b border-primary-400 outline-none text-sm font-semibold text-gray-800 bg-transparent"
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
              <select
                className={`text-xs font-medium px-2 py-1 rounded border ${statusCfg.bgColorLight} ${statusCfg.colorLight} border-gray-200`}
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
              >
                {JOB_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="truncate">{job.title}</span>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${statusCfg.bgColorLight} ${statusCfg.colorLight}`}>
                  <StatusIcon size={12} />
                  {statusCfg.label}
                </span>
              </div>
              {job.company && <span className="text-xs text-gray-400 font-normal block">{job.company}</span>}
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
              title="编辑岗位信息"
            >
              <Edit3 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {editing ? (
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-4 space-y-3 border-b border-gray-100">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">岗位链接（选填，可创建后补充）</label>
                <input
                  type="url"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={editJobUrl}
                  onChange={e => setEditJobUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">薪资（选填，可创建后补充）</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={editSalary}
                  onChange={e => setEditSalary(e.target.value)}
                  placeholder="如：25-40K"
                />
              </div>
            </div>
            <textarea
              className="flex-1 w-full p-4 text-sm text-gray-700 outline-none resize-none font-mono leading-relaxed min-h-0"
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="岗位描述内容..."
            />
          </div>
        ) : (
          <>
            {(job.job_url || job.salary) && (
              <div className="mx-4 mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                {job.job_url && (
                  <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 hover:underline">
                    <Link2 size={14} /> 岗位链接
                  </a>
                )}
                {job.salary && (
                  <span className="inline-flex items-center gap-1">
                    <DollarSign size={14} /> {job.salary}
                  </span>
                )}
              </div>
            )}
            <div className={`mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg ${statusCfg.bgColorLight} ${statusCfg.colorLight}`}>
              <StatusIcon size={16} />
              <span className="text-sm font-medium">当前状态：{statusCfg.label}</span>
            </div>
            <div className="p-4 markdown-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {job.content}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
