import { useState } from 'react';
import { Plus, FileText, Briefcase, Trash2, ChevronRight, ChevronDown, X, Settings, Upload, Loader2 } from 'lucide-react';
import { Job, Resume, CurrentProvider } from '../types';
import { createJob, deleteJob, deleteResume, parseJobFromFile } from '../api';

interface SidebarProps {
  jobs: Job[];
  resumes: Resume[];
  selectedJobId: number | null;
  selectedResumeId: number | null;
  onSelectJob: (job: Job) => void;
  onSelectResume: (resume: Resume) => void;
  onJobCreated: (job: Job) => void;
  onJobDeleted: (jobId: number) => void;
  onResumeDeleted: (resumeId: number) => void;
  currentProvider?: CurrentProvider | null;
  onOpenSettings?: () => void;
  onNewResume: (jobId: number) => void;
}

interface NewJobForm {
  title: string;
  company: string;
  content: string;
}

export function Sidebar(props: SidebarProps) {
  const { jobs, resumes, selectedJobId, selectedResumeId, onSelectJob, onSelectResume, onJobCreated, onJobDeleted, onResumeDeleted, onNewResume, currentProvider, onOpenSettings } = props;
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newJobForm, setNewJobForm] = useState<NewJobForm>({ title: '', company: '', content: '' });
  const [creating, setCreating] = useState(false);
  const [parsing, setParsing] = useState(false);

  const toggleJob = (jobId: number) => {
    const next = new Set(expandedJobs);
    next.has(jobId) ? next.delete(jobId) : next.add(jobId);
    setExpandedJobs(next);
  };

  const handleCreateJob = async () => {
    if (!newJobForm.title.trim() || !newJobForm.content.trim()) return;
    setCreating(true);
    try {
      const job = await createJob(newJobForm);
      onJobCreated(job);
      setNewJobForm({ title: '', company: '', content: '' });
      setShowNewJobModal(false);
      setExpandedJobs(prev => new Set(prev).add(job.id));
    } finally {
      setCreating(false);
    }
  };

  const handleParseJDFile = async (file?: File) => {
    if (!file) return;
    setParsing(true);
    try {
      const parsed = await parseJobFromFile(file);
      setNewJobForm({ title: parsed.title || '', company: parsed.company || '', content: parsed.content || '' });
    } catch (err) {
      console.error(err);
      alert('文件解析失败，请手动填写或检查OCR环境。');
    } finally {
      setParsing(false);
    }
  };

  const getJobResumes = (jobId: number) => resumes.filter(r => r.job_id === jobId);

  return (
    <>
      <div className="flex flex-col h-full bg-gray-900 text-gray-100 w-64 flex-shrink-0">
        <div className="px-4 py-4 border-b border-gray-700">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">求职 Agent</span>
          <button onClick={() => setShowNewJobModal(true)} className="mt-2 w-full flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} />新建岗位
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {jobs.length === 0 ? <div className="px-4 py-8 text-center text-gray-500 text-sm"><Briefcase size={32} className="mx-auto mb-2 opacity-40" /><p>暂无岗位</p></div> : jobs.map(job => {
            const jobResumes = getJobResumes(job.id);
            const isExpanded = expandedJobs.has(job.id);
            return <div key={job.id}>
              <div className={`group flex items-center gap-1 px-2 py-2 cursor-pointer hover:bg-gray-800 transition-colors ${selectedJobId === job.id ? 'bg-gray-800' : ''}`} onClick={() => { onSelectJob(job); toggleJob(job.id); }}>
                <button className="flex-shrink-0 p-0.5 hover:bg-gray-700 rounded" onClick={e => { e.stopPropagation(); toggleJob(job.id); }}>{isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}</button>
                <Briefcase size={14} className="flex-shrink-0 text-primary-400" />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{job.title}</p>{job.company && <p className="text-xs text-gray-400 truncate">{job.company}</p>}</div>
                <button className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 hover:bg-red-900 hover:text-red-400 rounded transition-all" onClick={async e => { e.stopPropagation(); if (confirm('确认删除该岗位及所有相关简历？')) { await deleteJob(job.id); onJobDeleted(job.id); } }}><Trash2 size={12} /></button>
              </div>
              {isExpanded && <div className="ml-4 border-l border-gray-700">
                {jobResumes.map(resume => <div key={resume.id} className={`group flex items-center gap-1 px-2 py-1.5 cursor-pointer hover:bg-gray-800 transition-colors ${selectedResumeId === resume.id ? 'bg-gray-800 text-primary-300' : 'text-gray-400'}`} onClick={() => onSelectResume(resume)}>
                  <FileText size={12} className="flex-shrink-0" />
                  <span className="text-xs flex-1 truncate">{resume.title || `简历 v${resume.version}`}</span>
                  <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 rounded transition-all" onClick={async e => { e.stopPropagation(); if (confirm('确认删除该简历？')) { await deleteResume(resume.id); onResumeDeleted(resume.id); } }}><Trash2 size={11} /></button>
                </div>)}
                <button className="w-full flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors" onClick={() => onNewResume(job.id)}><Plus size={12} />新建简历</button>
              </div>}
            </div>;
          })}
        </div>

        <div className="px-3 py-3 border-t border-gray-700 flex items-center justify-between gap-2">
          <button onClick={onOpenSettings} className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-left" title="AI 模型设置">
            <Settings size={13} className="text-gray-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">{currentProvider ? <><p className="text-xs text-gray-300 truncate font-medium">{currentProvider.provider_name}</p><p className="text-xs text-gray-500 truncate">{currentProvider.model}</p></> : <p className="text-xs text-gray-500">点击配置模型</p>}</div>
          </button>
          <span className="text-xs text-gray-600 flex-shrink-0">{jobs.length}岗·{resumes.length}历</span>
        </div>
      </div>

      {showNewJobModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b"><h2 className="text-lg font-semibold text-gray-800">新建岗位</h2><button onClick={() => setShowNewJobModal(false)}><X size={20} /></button></div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="p-3 rounded-lg border border-dashed border-primary-300 bg-primary-50">
              <label className="text-sm font-medium text-primary-700 block mb-2">上传JD（图片/PDF/Word，自动OCR+解析）</label>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-3 py-2 text-xs bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-1">
                  {parsing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}选择文件
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={e => handleParseJDFile(e.target.files?.[0])} />
                </label>
                <span className="text-xs text-gray-500">支持文字和图片上传，解析后自动填充岗位信息</span>
              </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">岗位名称 *</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={newJobForm.title} onChange={e => setNewJobForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">公司名称</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={newJobForm.company} onChange={e => setNewJobForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">岗位JD内容 *</label><textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" rows={10} value={newJobForm.content} onChange={e => setNewJobForm(f => ({ ...f, content: e.target.value }))} /></div>
          </div>
          <div className="px-6 py-4 border-t flex justify-end gap-3"><button className="px-4 py-2 text-sm border border-gray-300 rounded-lg" onClick={() => setShowNewJobModal(false)}>取消</button><button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50" disabled={creating || !newJobForm.title.trim() || !newJobForm.content.trim()} onClick={handleCreateJob}>{creating ? '创建中...' : '创建岗位'}</button></div>
        </div>
      </div>}
    </>
  );
}
