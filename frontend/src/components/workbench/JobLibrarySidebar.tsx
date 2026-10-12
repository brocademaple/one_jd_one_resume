import { useState, useEffect, useRef } from 'react';
import { Plus, Briefcase, Trash2, X, Upload, Loader2, Settings } from 'lucide-react';
import type { Job, Resume, CurrentProvider } from '../../types';
import { JOB_STATUS_OPTIONS } from '../../types';
import { createJob, deleteJob, parseJobFromFile, fetchCompetencyProfiles } from '../../api';
import {
  inferJobAnalysisStatus,
  getAnalysisStatusLabel,
  analysisStatusChipClass,
} from '../../utils/jobAnalysisStatus';

interface JobLibrarySidebarProps {
  jobs: Job[];
  resumes: Resume[];
  selectedJobId: number | null;
  iconStrip: boolean;
  onSelectJob: (job: Job) => void;
  onJobCreated: (job: Job) => void;
  onJobDeleted: (jobId: number) => void;
  currentProvider?: CurrentProvider | null;
  onOpenSettings?: () => void;
}

interface NewJobForm {
  link: string;
  title: string;
  salary: string;
  company: string;
  status: string;
  competency_profile: string;
  responsibilities: string;
  requirements: string;
  bonus: string;
}

function buildJobContent(form: NewJobForm): string {
  const parts: string[] = [`# ${form.title}`];
  if (form.link) parts.push(`岗位链接：${form.link}`);
  if (form.company) parts.push(`公司：${form.company}`);
  if (form.salary) parts.push(`薪资：${form.salary}`);
  parts.push('');
  if (form.responsibilities.trim()) parts.push('## 岗位职责\n\n' + form.responsibilities.trim());
  if (form.requirements.trim()) parts.push('## 任职要求\n\n' + form.requirements.trim());
  if (form.bonus.trim()) parts.push('## 加分项\n\n' + form.bonus.trim());
  return parts.join('\n\n').trim();
}

export function JobLibrarySidebar({
  jobs,
  resumes,
  selectedJobId,
  iconStrip,
  onSelectJob,
  onJobCreated,
  onJobDeleted,
  currentProvider,
  onOpenSettings,
}: JobLibrarySidebarProps) {
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [competencyProfiles, setCompetencyProfiles] = useState<string[]>(['default']);
  const [newJobForm, setNewJobForm] = useState<NewJobForm>({
    link: '',
    title: '',
    salary: '',
    company: '',
    status: 'pending',
    competency_profile: 'default',
    responsibilities: '',
    requirements: '',
    bonus: '',
  });

  useEffect(() => {
    fetchCompetencyProfiles()
      .then((res) => setCompetencyProfiles(res.profiles?.length ? res.profiles : ['default']))
      .catch(() => setCompetencyProfiles(['default']));
  }, []);

  const handleCreateJob = async () => {
    if (!newJobForm.title.trim() || (!newJobForm.responsibilities.trim() && !newJobForm.requirements.trim()))
      return;
    setCreating(true);
    try {
      const job = await createJob({
        title: newJobForm.title,
        company: newJobForm.company || undefined,
        job_url: newJobForm.link?.trim() || undefined,
        salary: newJobForm.salary?.trim() || undefined,
        content: buildJobContent(newJobForm),
        status: newJobForm.status,
        competency_profile: newJobForm.competency_profile,
      });
      onJobCreated(job);
      setNewJobForm({
        link: '',
        title: '',
        salary: '',
        company: '',
        status: 'pending',
        competency_profile: 'default',
        responsibilities: '',
        requirements: '',
        bonus: '',
      });
      setShowNewJobModal(false);
    } finally {
      setCreating(false);
    }
  };

  const handleParseJDFile = async (file?: File) => {
    if (!file) return;
    setParsing(true);
    try {
      const parsed = await parseJobFromFile(file);
      setNewJobForm((prev) => ({
        ...prev,
        title: parsed.title || prev.title,
        company: parsed.company || prev.company,
        responsibilities: parsed.content || prev.responsibilities,
      }));
    } catch {
      alert('文件解析失败，请手动填写或检查 OCR 环境。');
    } finally {
      setParsing(false);
    }
  };

  const widthClass = iconStrip ? 'w-[52px]' : 'w-[200px]';

  return (
    <>
      <aside
        className={`flex flex-col h-full flex-shrink-0 bg-primary-600 text-white transition-all duration-200 ${widthClass}`}
      >
        {!iconStrip && (
          <div className="px-2.5 py-2 border-b border-white/15 flex items-center justify-between gap-1">
            <span className="text-[12px] font-semibold">岗位库</span>
            <button
              type="button"
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/15 hover:bg-white/25 ojor-bubble"
              onClick={() => setShowNewJobModal(true)}
            >
              <Plus size={12} className="inline -mt-0.5 mr-0.5" />
              新建
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1.5 space-y-1 px-1">
          {iconStrip
            ? jobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  title={job.title}
                  className={[
                    'w-full flex items-center justify-center py-2 rounded-lg ojor-bubble',
                    selectedJobId === job.id ? 'bg-primary-700' : 'hover:bg-primary-500/80',
                  ].join(' ')}
                  onClick={() => onSelectJob(job)}
                >
                  <Briefcase size={16} />
                </button>
              ))
            : jobs.map((job) => {
                const status = inferJobAnalysisStatus(
                  job,
                  resumes.filter((r) => r.job_id === job.id),
                );
                const active = selectedJobId === job.id;
                return (
                  <div
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    className={[
                      'group relative rounded-xl px-2 py-2 cursor-pointer ojor-bubble border border-transparent',
                      active ? 'bg-primary-700 shadow-md' : 'hover:bg-primary-500/90',
                    ].join(' ')}
                    onClick={() => onSelectJob(job)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectJob(job)}
                  >
                    <p className="text-[12px] font-medium leading-snug line-clamp-2">{job.title}</p>
                    {job.company && (
                      <p className="text-[10px] text-white/75 mt-0.5 truncate">{job.company}</p>
                    )}
                    <span
                      className={[
                        'inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                        analysisStatusChipClass(status),
                      ].join(' ')}
                    >
                      {getAnalysisStatusLabel(status)}
                    </span>
                    <button
                      type="button"
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/30"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('确认删除该岗位及所有相关简历？')) {
                          await deleteJob(job.id);
                          onJobDeleted(job.id);
                        }
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
        </div>

        {!iconStrip && (
          <div className="px-2 py-2 border-t border-white/15">
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full flex items-center gap-1.5 text-[10px] text-white/80 hover:text-white"
            >
              <Settings size={12} />
              <span className="truncate">{currentProvider?.model_name ?? '模型设置'}</span>
            </button>
          </div>
        )}
      </aside>

      {showNewJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-[640px] max-h-[80vh] flex flex-col text-slate-900">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-base font-semibold">新建岗位</h2>
              <button type="button" onClick={() => setShowNewJobModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-[13px]">
              <div className="p-2.5 rounded-lg border border-dashed border-primary-300 bg-primary-50">
                <label className="font-medium text-primary-700 block mb-1.5">上传岗位信息</label>
                <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1.5 text-xs bg-white border rounded-lg">
                  {parsing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                  选择文件
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => handleParseJDFile(e.target.files?.[0])}
                  />
                </label>
              </div>
              <div>
                <label className="block font-medium mb-1">岗位名称 *</label>
                <input
                  className="w-full border rounded-lg px-2 py-1.5"
                  value={newJobForm.title}
                  onChange={(e) => setNewJobForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">公司</label>
                <input
                  className="w-full border rounded-lg px-2 py-1.5"
                  value={newJobForm.company}
                  onChange={(e) => setNewJobForm((f) => ({ ...f, company: e.target.value }))}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">状态</label>
                <select
                  className="w-full border rounded-lg px-2 py-1.5"
                  value={newJobForm.status}
                  onChange={(e) => setNewJobForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {JOB_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">胜任力模型</label>
                <select
                  className="w-full border rounded-lg px-2 py-1.5"
                  value={newJobForm.competency_profile}
                  onChange={(e) =>
                    setNewJobForm((f) => ({ ...f, competency_profile: e.target.value }))
                  }
                >
                  {competencyProfiles.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">岗位职责 *</label>
                <textarea
                  className="w-full border rounded-lg px-2 py-1.5 resize-none"
                  rows={4}
                  value={newJobForm.responsibilities}
                  onChange={(e) =>
                    setNewJobForm((f) => ({ ...f, responsibilities: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">任职要求 *</label>
                <textarea
                  className="w-full border rounded-lg px-2 py-1.5 resize-none"
                  rows={4}
                  value={newJobForm.requirements}
                  onChange={(e) => setNewJobForm((f) => ({ ...f, requirements: e.target.value }))}
                />
              </div>
            </div>
            <div className="px-4 py-3 border-t flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm border rounded-lg"
                onClick={() => setShowNewJobModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50"
                disabled={
                  creating ||
                  !newJobForm.title.trim() ||
                  (!newJobForm.responsibilities.trim() && !newJobForm.requirements.trim())
                }
                onClick={handleCreateJob}
              >
                {creating ? '创建中…' : '创建岗位'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
