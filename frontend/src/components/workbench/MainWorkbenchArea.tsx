import { useEffect, useMemo, useState } from 'react';
import type { Job, Resume } from '../../types';
import { fetchCompetencyModels } from '../../api';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';
import {
  buildCapabilitiesFromDimensions,
  defaultCapabilitiesForJob,
  type WorkbenchCapability,
} from '../../utils/workbenchCapabilities';
import {
  inferJobAnalysisStatus,
  getAnalysisStatusLabel,
} from '../../utils/jobAnalysisStatus';
import { HexRadarChart } from './HexRadarChart';
import { JDHighlightPanel } from './JDHighlightPanel';
import { EvidenceGapsPanel } from './EvidenceGapsPanel';
import { ResumePanel } from '../ResumePanel';
import { InterviewGuidePanel } from '../InterviewGuidePanel';

interface MainWorkbenchAreaProps {
  job: Job | null;
  resumes: Resume[];
  selectedResume: Resume | null;
  onResumeUpdated: (resume: Resume) => void;
  onNewResume: (jobId: number) => void;
  interviewNotesRefreshKey: number;
  canStartSimulation: boolean;
  backgroundProfileId: number | null;
  onStartInterviewSim?: (preferredCategories: string[] | null) => void;
}

export function MainWorkbenchArea({
  job,
  resumes,
  selectedResume,
  onResumeUpdated,
  onNewResume,
  interviewNotesRefreshKey,
  canStartSimulation,
  backgroundProfileId,
  onStartInterviewSim,
}: MainWorkbenchAreaProps) {
  const { step, centerTab, setCenterTab, selectedCapabilityId, setSelectedCapabilityId } =
    useWorkbenchStore();
  const [models, setModels] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchCompetencyModels()
      .then((res) => setModels(res.models || {}))
      .catch(() => setModels({}));
  }, []);

  const capabilities: WorkbenchCapability[] = useMemo(() => {
    if (!job) return defaultCapabilitiesForJob(null);
    const profile = job.competency_profile || 'default';
    const dims = models[profile];
    if (dims?.length) return buildCapabilitiesFromDimensions(job, dims);
    return defaultCapabilitiesForJob(job);
  }, [job, models]);

  useEffect(() => {
    if (capabilities.length && !capabilities.find((c) => c.id === selectedCapabilityId)) {
      setSelectedCapabilityId(capabilities[0]?.id ?? null);
    }
  }, [capabilities, selectedCapabilityId, setSelectedCapabilityId]);

  const selectedCap =
    capabilities.find((c) => c.id === selectedCapabilityId) ?? capabilities[0] ?? null;

  if (!job) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-[13px]">
        从左侧选择岗位，或新建岗位开始拆解
      </div>
    );
  }

  const analysisStatus = inferJobAnalysisStatus(
    job,
    resumes.filter((r) => r.job_id === job.id),
  );
  const gapCount = capabilities.filter((c) => c.matchState !== 'done').length;

  if (step === 3) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-3 grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-[14px] font-semibold text-slate-900">证据原文</h2>
          <div className="ojor-glass rounded-2xl p-3 text-[13px] text-slate-800 leading-relaxed">
            <p className="text-slate-500 text-[11px] mb-2">
              对照助手与简历中的可引用片段将汇总于此（可在对话中收藏到面试指导）。
            </p>
            {selectedResume ? (
              <div className="border-l-[3px] border-primary-600 pl-2 bg-primary-500/5 rounded-r-lg py-1">
                当前简历：{selectedResume.title || `v${selectedResume.version}`}
              </div>
            ) : (
              <button
                type="button"
                className="text-primary-600 text-[12px] underline"
                onClick={() => onNewResume(job.id)}
              >
                新建简历以开始对照
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-[14px] font-semibold text-slate-900">待补清单</h2>
          <EvidenceGapsPanel capabilities={capabilities} />
          <InterviewGuidePanel
            jobId={job.id}
            refreshKey={interviewNotesRefreshKey}
            resumeId={selectedResume?.id ?? null}
            backgroundProfileId={backgroundProfileId}
            canStartSimulation={canStartSimulation}
            onStartInterviewSim={onStartInterviewSim}
          />
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-center text-[13px] text-slate-600">
        <p>
          岗位库在左侧栏。选中岗位后，请切换到
          <button
            type="button"
            className="text-primary-600 mx-1 font-medium"
            onClick={() => useWorkbenchStore.getState().setStep(2)}
          >
            能力拆解 / 对照
          </button>
          继续。
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-2 gap-2">
      <div className="ojor-glass rounded-2xl px-3 py-2 flex flex-wrap items-center gap-2 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-[14px] font-semibold text-slate-900 truncate">{job.title}</h1>
          <p className="text-[11px] text-slate-500">
            {[job.company, job.salary].filter(Boolean).join(' · ') || '未填写公司'}
          </p>
        </div>
        {gapCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-300/40">
            待补证据 · {gapCount}项
          </span>
        )}
        <span className="text-[10px] text-slate-500">{getAnalysisStatusLabel(analysisStatus)}</span>
      </div>

      <div className="flex gap-1 flex-shrink-0">
        {(
          [
            { id: 'analysis' as const, label: '岗位分析' },
            { id: 'compare' as const, label: '候选人对照' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={[
              'text-[12px] px-3 py-1 rounded-full ojor-bubble border',
              centerTab === tab.id
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white/50 text-slate-600 border-white/60 hover:border-primary-200',
            ].join(' ')}
            onClick={() => setCenterTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {centerTab === 'analysis' ? (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 relative">
          <div className="min-h-0 flex flex-col items-center justify-center ojor-glass rounded-2xl p-2 relative">
            <HexRadarChart
              capabilities={capabilities}
              selectedId={selectedCap?.id ?? null}
              onSelect={setSelectedCapabilityId}
            />
            <div className="absolute bottom-2 left-2 right-2 max-w-[200px]">
              <EvidenceGapsPanel capabilities={capabilities} compact />
            </div>
          </div>
          <div className="min-h-0">
            <JDHighlightPanel
              job={job}
              capabilities={capabilities}
              selectedCapability={selectedCap}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-2">
          <div className="min-h-0 grid grid-rows-[auto_1fr] gap-2">
            <div className="ojor-glass rounded-2xl p-2 min-h-[200px]">
              <HexRadarChart
                capabilities={capabilities}
                selectedId={selectedCap?.id ?? null}
                onSelect={setSelectedCapabilityId}
                overlayMode
              />
            </div>
            <div className="min-h-0 ojor-glass rounded-2xl overflow-hidden flex flex-col">
              <div className="px-2 py-1.5 border-b border-white/40 text-[12px] font-medium">
                投前差距指导
              </div>
              <div className="flex-1 overflow-y-auto p-2 text-[12px] text-slate-700 space-y-2">
                {capabilities
                  .filter((c) => c.matchState !== 'done')
                  .map((c) => (
                    <div
                      key={c.id}
                      className="border-l-[3px] border-amber-500 pl-2 py-1 bg-amber-500/5 rounded-r-lg"
                    >
                      <div className="font-medium">{c.label}</div>
                      <div className="text-[11px] text-slate-600">{c.evidenceHint}</div>
                    </div>
                  ))}
                {capabilities.every((c) => c.matchState === 'done') && (
                  <p className="text-slate-500">各维度已有基础证据，可进入模拟面试强化表达。</p>
                )}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex flex-col gap-2">
            <EvidenceGapsPanel capabilities={capabilities} />
            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-white/50 bg-white/40">
              {selectedResume ? (
                <ResumePanel resume={selectedResume} onResumeUpdated={onResumeUpdated} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center text-[12px] text-slate-500">
                  <p className="mb-2">尚无简历对照</p>
                  <button
                    type="button"
                    className="text-primary-600 font-medium"
                    onClick={() => onNewResume(job.id)}
                  >
                    新建简历
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
