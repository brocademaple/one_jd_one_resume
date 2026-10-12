import { useEffect, useCallback, useState } from 'react';
import { WorkbenchShell } from './components/workbench/WorkbenchShell';
import { BackgroundProfileModal } from './components/background/BackgroundProfileModal';
import { BackgroundImportModal } from './components/background/BackgroundImportModal';
import { SettingsModal } from './components/SettingsModal';
import { InterviewSimulationModal } from './components/InterviewSimulationModal';
import { InterviewQuestionBankModal } from './components/InterviewQuestionBankModal';
import { ExportPreviewModal } from './components/ExportPreviewModal';
import { ToastContainer } from './components/Toast';
import { useAppStore } from './store/useAppStore';
import { useWorkbenchStore } from './store/useWorkbenchStore';
import { fetchJobs, fetchResumes, createResume, fetchCurrentProvider } from './api';
import { handleApiError, showInfo } from './utils/errorHandler';
import { fetchDefaultResumeTitle } from './utils/resumeDefaultTitle';
import { useBackgroundProfiles } from './hooks/useBackgroundProfiles';

function App() {
  const [showBgModal, setShowBgModal] = useState(false);
  const [showBgImportModal, setShowBgImportModal] = useState(false);
  const [showInterviewSim, setShowInterviewSim] = useState(false);
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [exportModal, setExportModal] = useState<{ resumeId: number; title: string; content: string } | null>(null);
  const [interviewPreferredCategories, setInterviewPreferredCategories] = useState<string[] | null>(null);
  const bg = useBackgroundProfiles({ modalOpen: showBgModal });

  const {
    jobs,
    resumes,
    selectedJob,
    selectedResume,
    loading,
    showSettings,
    currentProvider,
    interviewNotesRefreshKey,
    setJobs,
    setResumes,
    setLoading,
    setCurrentProvider,
    setShowSettings,
    incrementInterviewNotesRefreshKey,
    addJob,
    deleteJob,
    updateJob,
    addResume,
    updateResume,
    deleteResume,
    selectJob,
    selectResume,
  } = useAppStore();

  const { setStep, setCenterTab } = useWorkbenchStore();

  const loadProviderInfo = useCallback(async () => {
    try {
      const info = await fetchCurrentProvider();
      setCurrentProvider(info);
    } catch (err) {
      handleApiError(err, '加载模型信息失败');
    }
  }, [setCurrentProvider]);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const jobsData = await fetchJobs();
        setJobs(jobsData);
        await loadProviderInfo();
      } catch (err) {
        handleApiError(err, '加载岗位失败');
      }
    };
    void loadJobs();
  }, [loadProviderInfo, setJobs]);

  useEffect(() => {
    const loadResumes = async () => {
      try {
        setLoading(true);
        const resumesData = await fetchResumes({
          backgroundProfileId: bg.activeProfileId,
        });
        setResumes(resumesData);
        if (selectedJob) {
          selectJob(selectedJob);
        }
      } catch (err) {
        handleApiError(err, '加载简历失败');
      } finally {
        setLoading(false);
      }
    };

    void loadResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg.activeProfileId, selectedJob, setResumes, setLoading, selectJob]);

  const handleSelectJob = useCallback(
    (job: typeof selectedJob) => {
      if (job) selectJob(job);
    },
    [selectJob],
  );

  const handleSelectResume = useCallback(
    (resume: typeof selectedResume) => {
      if (resume) selectResume(resume);
    },
    [selectResume],
  );

  const handleJobUpdated = useCallback(
    (job: typeof selectedJob) => {
      if (job) updateJob(job);
    },
    [updateJob],
  );

  const handleResumeDeleted = useCallback(
    (resumeId: number) => {
      deleteResume(resumeId);
    },
    [deleteResume],
  );

  const handleJobCreated = useCallback(
    (job: typeof selectedJob) => {
      if (job) addJob(job);
    },
    [addJob],
  );

  const handleJobDeleted = useCallback(
    (jobId: number) => {
      deleteJob(jobId);
    },
    [deleteJob],
  );

  const handleResumeCreated = useCallback(
    (resume: typeof selectedResume) => {
      if (resume) addResume(resume);
    },
    [addResume],
  );

  const handleResumeUpdated = useCallback(
    (resume: typeof selectedResume) => {
      if (resume) updateResume(resume);
    },
    [updateResume],
  );

  const handleNewResume = useCallback(
    async (jobId: number) => {
      const job = jobs.find((j) => j.id === jobId);
      if (!job) return;
      try {
        const title = await fetchDefaultResumeTitle(job.title);
        const resume = await createResume({
          job_id: jobId,
          content: `# 简历\n\n> 请与 Agent 对话生成定制简历内容。`,
          title,
          background_profile_id: bg.activeProfileId,
        });
        addResume(resume);
        selectJob(job);
        setStep(2);
        setCenterTab('compare');
      } catch (err) {
        handleApiError(err, '创建简历失败');
      }
    },
    [jobs, addResume, selectJob, bg.activeProfileId, setStep, setCenterTab],
  );

  const handleExport = useCallback(() => {
    if (!selectedResume) {
      showInfo('请先创建并选择一份简历后再导出');
      return;
    }
    setExportModal({
      resumeId: selectedResume.id,
      title: selectedResume.title || `简历 v${selectedResume.version}`,
      content: selectedResume.content,
    });
  }, [selectedResume]);

  const handleQuestionBank = useCallback(() => {
    if (!selectedJob || !selectedResume) {
      showInfo('请先选择岗位与简历以打开题库');
      return;
    }
    setShowQuestionBank(true);
  }, [selectedJob, selectedResume]);

  const handleMockInterview = useCallback(() => {
    if (!selectedJob || !selectedResume || selectedResume.job_id !== selectedJob.id) {
      showInfo('模拟面试前请先完成投前差距指导，并确保已选中对应简历');
      return;
    }
    setInterviewPreferredCategories(null);
    setShowInterviewSim(true);
  }, [selectedJob, selectedResume]);

  const handlePreApplyGuidance = useCallback(() => {
    setStep(2);
    setCenterTab('compare');
  }, [setStep, setCenterTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full ojor-workbench-bg">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <WorkbenchShell
        jobs={jobs}
        resumes={resumes}
        selectedJob={selectedJob}
        selectedResume={selectedResume}
        currentProvider={currentProvider}
        onSelectJob={handleSelectJob}
        onSelectResume={handleSelectResume}
        onJobCreated={handleJobCreated}
        onJobDeleted={handleJobDeleted}
        onJobUpdated={handleJobUpdated}
        onResumeDeleted={handleResumeDeleted}
        onResumeUpdated={handleResumeUpdated}
        onResumeCreated={handleResumeCreated}
        onNewResume={handleNewResume}
        onOpenBackground={() => setShowBgModal(true)}
        onOpenSettings={() => setShowSettings(true)}
        bg={bg}
        interviewNotesRefreshKey={interviewNotesRefreshKey}
        onInterviewNoteAdded={incrementInterviewNotesRefreshKey}
        canStartSimulation={
          !!selectedJob &&
          !!selectedResume &&
          bg.activeProfileId != null &&
          selectedResume.job_id === selectedJob.id
        }
        onStartInterviewSim={(preferredCategories) => {
          setInterviewPreferredCategories(preferredCategories);
          setShowInterviewSim(true);
        }}
        onExport={handleExport}
        onQuestionBank={handleQuestionBank}
        onMockInterview={handleMockInterview}
        onPreApplyGuidance={handlePreApplyGuidance}
      />

      <BackgroundProfileModal
        open={showBgModal}
        onClose={() => setShowBgModal(false)}
        onOpenImportModal={() => setShowBgImportModal(true)}
        loadingProfiles={bg.loadingProfiles}
        profiles={bg.profiles}
        activeProfileId={bg.activeProfileId}
        editingName={bg.editingName}
        background={bg.background}
        savingBackground={bg.savingBackground}
        creatingProfileFromText={bg.creatingProfileFromText}
        backgroundSaved={bg.backgroundSaved}
        onSelectProfile={bg.handleSelectProfile}
        onNewProfile={bg.handleNewProfile}
        onDeleteProfile={bg.handleDeleteProfile}
        onEditingNameChange={bg.setEditingName}
        onBackgroundChange={bg.setBackground}
        onSave={bg.handleSave}
        onCreateProfileFromParsedText={bg.handleCreateProfileFromParsedText}
        onEditorDirty={bg.markEditorDirty}
      />

      <BackgroundImportModal
        open={showBgImportModal}
        onClose={() => setShowBgImportModal(false)}
        parseBackgroundFile={bg.parseBackgroundFile}
        createProfileFromImport={bg.createProfileFromImport}
        committing={bg.savingBackground}
      />

      {showInterviewSim && selectedJob && selectedResume && selectedResume.job_id === selectedJob.id && (
        <InterviewSimulationModal
          open={showInterviewSim}
          onClose={() => {
            setShowInterviewSim(false);
            setInterviewPreferredCategories(null);
          }}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          resumeId={selectedResume.id}
          resumeTitle={selectedResume.title ?? null}
          userBackground={bg.background?.trim() || undefined}
          backgroundProfileId={bg.activeProfileId}
          preferredCategories={interviewPreferredCategories}
        />
      )}

      {showQuestionBank && selectedJob && selectedResume && (
        <InterviewQuestionBankModal
          open={showQuestionBank}
          onClose={() => setShowQuestionBank(false)}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          resumeId={selectedResume.id}
          backgroundProfileId={bg.activeProfileId}
          canStartSimulation={
            !!selectedResume &&
            bg.activeProfileId != null &&
            selectedResume.job_id === selectedJob.id
          }
          onStartSimulation={(preferredCategories) => {
            setShowQuestionBank(false);
            setInterviewPreferredCategories(preferredCategories);
            setShowInterviewSim(true);
          }}
        />
      )}

      {exportModal && (
        <ExportPreviewModal
          open={true}
          onClose={() => setExportModal(null)}
          format="pdf"
          resumeId={exportModal.resumeId}
          resumeTitle={exportModal.title}
          content={exportModal.content}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSaved={() => {
            setShowSettings(false);
            loadProviderInfo();
          }}
        />
      )}
    </>
  );
}

export default App;
