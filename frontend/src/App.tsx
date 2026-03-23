import { useEffect, useCallback, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { JDAndInterviewGuideColumn } from './components/JDAndInterviewGuideColumn';
import { ResumePanel } from './components/ResumePanel';
import { ChatPanel } from './components/ChatPanel';
import { AppHeaderBar } from './components/AppHeaderBar';
import { BackgroundProfileModal } from './components/background/BackgroundProfileModal';
import { BackgroundImportModal } from './components/background/BackgroundImportModal';
import {
  ResizablePanels,
  type ResizablePanelsHandle,
  type PanelCollapseState,
} from './components/ResizablePanels';
import { ResizableDivider } from './components/ResizableDivider';
import { SettingsModal } from './components/SettingsModal';
import { InterviewSimulationModal } from './components/InterviewSimulationModal';
import { ToastContainer } from './components/Toast';
import { useAppStore } from './store/useAppStore';
import { fetchJobs, fetchResumes, createResume, fetchCurrentProvider } from './api';
import { handleApiError } from './utils/errorHandler';
import { fetchDefaultResumeTitle } from './utils/resumeDefaultTitle';
import { useBackgroundProfiles } from './hooks/useBackgroundProfiles';

function App() {
  const mainRef = useRef<HTMLDivElement>(null);
  const [showBgModal, setShowBgModal] = useState(false);
  const [showBgImportModal, setShowBgImportModal] = useState(false);
  const [showInterviewSim, setShowInterviewSim] = useState(false);
  const bg = useBackgroundProfiles({ modalOpen: showBgModal });
  const panelsRef = useRef<ResizablePanelsHandle>(null);
  const [panelCollapsed, setPanelCollapsed] = useState<PanelCollapseState>({
    jdCollapsed: false,
    resumeCollapsed: false,
    chatCollapsed: false,
  });

  const onPanelCollapseChange = useCallback((s: PanelCollapseState) => {
    setPanelCollapsed(s);
  }, []);

  // Use Zustand store
  const {
    jobs,
    resumes,
    selectedJob,
    selectedResume,
    loading,
    showSettings,
    currentProvider,
    sidebarWidth,
    sidebarCollapsed,
    expandInterviewGuide,
    interviewNotesRefreshKey,
    setJobs,
    setResumes,
    setLoading,
    setCurrentProvider,
    setShowSettings,
    setSidebarWidth,
    setSidebarCollapsed,
    setExpandInterviewGuide,
    incrementInterviewNotesRefreshKey,
    addJob,
    updateJob,
    deleteJob,
    addResume,
    updateResume,
    deleteResume,
    selectJob,
    selectResume
  } = useAppStore();

  useEffect(() => {
    if (!expandInterviewGuide) return;
    const t = setTimeout(() => setExpandInterviewGuide(false), 150);
    return () => clearTimeout(t);
  }, [expandInterviewGuide]);

  const loadProviderInfo = useCallback(async () => {
    try {
      const info = await fetchCurrentProvider();
      setCurrentProvider(info);
    } catch (err) {
      handleApiError(err, '加载模型信息失败');
    }
  }, [setCurrentProvider]);

  useEffect(() => {
    const load = async () => {
      try {
        const [jobsData, resumesData] = await Promise.all([
          fetchJobs(),
          fetchResumes(),
        ]);
        setJobs(jobsData);
        setResumes(resumesData);
        await loadProviderInfo();
      } catch (err) {
        handleApiError(err, '加载数据失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadProviderInfo, setJobs, setResumes, setLoading]);

  // Simplified handlers using Zustand actions
  const handleSelectJob = useCallback((job: typeof selectedJob) => {
    if (job) selectJob(job);
  }, [selectJob]);

  const handleSelectResume = useCallback((resume: typeof selectedResume) => {
    if (resume) selectResume(resume);
  }, [selectResume]);

  const handleJobCreated = useCallback((job: typeof selectedJob) => {
    if (job) addJob(job);
  }, [addJob]);

  const handleJobUpdated = useCallback((job: typeof selectedJob) => {
    if (job) updateJob(job);
  }, [updateJob]);

  const handleJobDeleted = useCallback((jobId: number) => {
    deleteJob(jobId);
  }, [deleteJob]);

  const handleResumeCreated = useCallback((resume: typeof selectedResume) => {
    if (resume) addResume(resume);
  }, [addResume]);

  const handleResumeUpdated = useCallback((resume: typeof selectedResume) => {
    if (resume) updateResume(resume);
  }, [updateResume]);

  const handleResumeDeleted = useCallback((resumeId: number) => {
    deleteResume(resumeId);
  }, [deleteResume]);

  const handleNewResume = useCallback(async (jobId: number) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    try {
      const title = await fetchDefaultResumeTitle(job.title);
      const resume = await createResume({
        job_id: jobId,
        content: `# 简历\n\n> 请与Agent对话生成定制简历内容。`,
        title,
      });
      addResume(resume);
      selectJob(job);
    } catch (err) {
      handleApiError(err, '创建简历失败');
    }
  }, [jobs, addResume, selectJob]);

  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth(Math.max(180, Math.min(400, sidebarWidth + delta)));
  }, [sidebarWidth, setSidebarWidth]);

  const toggleSidebar = useCallback(() => {
    if (sidebarCollapsed) {
      setSidebarWidth(256);
      setSidebarCollapsed(false);
    } else {
      setSidebarWidth(0);
      setSidebarCollapsed(true);
    }
  }, [sidebarCollapsed, setSidebarWidth, setSidebarCollapsed]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <div ref={mainRef} className="flex w-full h-full overflow-hidden min-w-0">
      <div
        className="flex-shrink-0 overflow-hidden transition-all duration-200"
        style={{ width: sidebarCollapsed ? 0 : sidebarWidth, minWidth: sidebarCollapsed ? 0 : 180 }}
      >
        <Sidebar
        jobs={jobs}
        resumes={resumes}
        selectedJobId={selectedJob?.id ?? null}
        selectedResumeId={selectedResume?.id ?? null}
        onSelectJob={handleSelectJob}
        onSelectResume={handleSelectResume}
        onJobCreated={handleJobCreated}
        onJobDeleted={handleJobDeleted}
        onResumeDeleted={handleResumeDeleted}
        onResumeUpdated={handleResumeUpdated}
        onNewResume={handleNewResume}
        onExpandInterviewGuide={() => setExpandInterviewGuide(true)}
        onInterviewGuideDeleted={incrementInterviewNotesRefreshKey}
        onInterviewGuideRenamed={incrementInterviewNotesRefreshKey}
        currentProvider={currentProvider}
        onOpenSettings={() => setShowSettings(true)}
      />
      </div>

      <ResizableDivider
        onResize={handleSidebarResize}
        onToggle={toggleSidebar}
        collapsed={sidebarCollapsed}
        toggleExpandLabel="展开岗位栏"
        toggleCollapseLabel="收起岗位栏"
      />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ flex: '1 1 0' }}>
        <AppHeaderBar
          bg={bg}
          onOpenBackground={() => setShowBgModal(true)}
          columnToggles={{
            jdCollapsed: panelCollapsed.jdCollapsed,
            resumeCollapsed: panelCollapsed.resumeCollapsed,
            chatCollapsed: panelCollapsed.chatCollapsed,
            onToggleJd: () => panelsRef.current?.toggleJd(),
            onToggleResume: () => panelsRef.current?.toggleResume(),
            onToggleChat: () => panelsRef.current?.toggleChat(),
          }}
        />
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <ResizablePanels ref={panelsRef} onCollapseStateChange={onPanelCollapseChange}>
            <JDAndInterviewGuideColumn
              job={selectedJob}
              onJobUpdated={handleJobUpdated}
              expandInterviewGuide={expandInterviewGuide}
              interviewNotesRefreshKey={interviewNotesRefreshKey}
              interviewSimEnabled={
                !!selectedJob &&
                !!selectedResume &&
                selectedResume.job_id === selectedJob.id
              }
              onOpenInterviewSim={() => setShowInterviewSim(true)}
            />
            <ResumePanel resume={selectedResume} onResumeUpdated={handleResumeUpdated} />
            <ChatPanel
              jobId={selectedJob?.id ?? null}
              jobTitle={selectedJob?.title ?? null}
              resumeId={selectedResume?.id ?? null}
              onResumeCreated={handleResumeCreated}
              onResumeUpdated={handleResumeUpdated}
              onInterviewNoteAdded={incrementInterviewNotesRefreshKey}
              currentProvider={currentProvider}
              onOpenSettings={() => setShowSettings(true)}
              bg={bg}
            />
          </ResizablePanels>
        </div>
      </div>

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
          onClose={() => setShowInterviewSim(false)}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          resumeId={selectedResume.id}
          resumeTitle={selectedResume.title ?? null}
          userBackground={bg.background?.trim() || undefined}
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
      </div>
    </>
  );
}

export default App;
