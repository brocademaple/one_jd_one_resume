import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { JDPanel } from './components/JDPanel';
import { ResumePanel } from './components/ResumePanel';
import { ChatPanel } from './components/ChatPanel';
import { ResizablePanels } from './components/ResizablePanels';
import { ResizableDivider } from './components/ResizableDivider';
import { SettingsModal } from './components/SettingsModal';
import { Job, Resume, CurrentProvider } from './types';
import { fetchJobs, fetchResumes, createResume, fetchCurrentProvider } from './api';

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<CurrentProvider | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const loadProviderInfo = useCallback(async () => {
    try {
      const info = await fetchCurrentProvider();
      setCurrentProvider(info);
    } catch {
      // silently ignore
    }
  }, []);

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
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loadProviderInfo]);

  const handleSelectJob = useCallback((job: Job) => {
    setSelectedJob(job);
    const jobResumes = resumes.filter(r => r.job_id === job.id);
    if (jobResumes.length > 0) {
      setSelectedResume(jobResumes[0]);
    } else {
      setSelectedResume(null);
    }
  }, [resumes]);

  const handleSelectResume = useCallback((resume: Resume) => {
    setSelectedResume(resume);
    const job = jobs.find(j => j.id === resume.job_id);
    if (job) setSelectedJob(job);
  }, [jobs]);

  const handleJobCreated = useCallback((job: Job) => {
    setJobs(prev => [job, ...prev]);
    setSelectedJob(job);
    setSelectedResume(null);
  }, []);

  const handleJobUpdated = useCallback((job: Job) => {
    setJobs(prev => prev.map(j => j.id === job.id ? job : j));
    setSelectedJob(job);
  }, []);

  const handleJobDeleted = useCallback((jobId: number) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
    setResumes(prev => prev.filter(r => r.job_id !== jobId));
    if (selectedJob?.id === jobId) {
      setSelectedJob(null);
      setSelectedResume(null);
    }
  }, [selectedJob]);

  const handleResumeCreated = useCallback((resume: Resume) => {
    setResumes(prev => [resume, ...prev]);
    setSelectedResume(resume);
  }, []);

  const handleResumeUpdated = useCallback((resume: Resume) => {
    setResumes(prev => prev.map(r => r.id === resume.id ? resume : r));
    if (selectedResume?.id === resume.id) setSelectedResume(resume);
  }, [selectedResume]);

  const handleResumeDeleted = useCallback((resumeId: number) => {
    setResumes(prev => prev.filter(r => r.id !== resumeId));
    if (selectedResume?.id === resumeId) setSelectedResume(null);
  }, [selectedResume]);

  const handleNewResume = useCallback(async (jobId: number) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    try {
      const resume = await createResume({
        job_id: jobId,
        content: `# 简历\n\n> 请与Agent对话生成定制简历内容。`,
        title: '新建简历',
      });
      setResumes(prev => [resume, ...prev]);
      setSelectedJob(job);
      setSelectedResume(resume);
    } catch (err) {
      console.error(err);
    }
  }, [jobs]);

  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth(prev => Math.max(180, Math.min(400, prev + delta)));
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      if (prev) {
        setSidebarWidth(256);
        return false;
      }
      setSidebarWidth(0);
      return true;
    });
  }, []);

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
        onNewResume={handleNewResume}
        currentProvider={currentProvider}
        onOpenSettings={() => setShowSettings(true)}
      />
      </div>

      <ResizableDivider
        onResize={handleSidebarResize}
        onToggle={toggleSidebar}
        collapsed={sidebarCollapsed}
      />

      <div className="flex-1 min-w-0 flex overflow-hidden" style={{ flex: '1 1 0' }}>
      <ResizablePanels>
        <JDPanel job={selectedJob} onJobUpdated={handleJobUpdated} />
        <ResumePanel resume={selectedResume} onResumeUpdated={handleResumeUpdated} />
        <ChatPanel
          jobId={selectedJob?.id ?? null}
          resumeId={selectedResume?.id ?? null}
          onResumeCreated={handleResumeCreated}
          onResumeUpdated={handleResumeUpdated}
          currentProvider={currentProvider}
          onOpenSettings={() => setShowSettings(true)}
        />
      </ResizablePanels>
      </div>

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
  );
}

export default App;
