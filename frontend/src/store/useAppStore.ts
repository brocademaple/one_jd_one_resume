import { create } from 'zustand';
import { Job, Resume, CurrentProvider } from '../types';

interface AppState {
  // Data
  jobs: Job[];
  resumes: Resume[];
  selectedJob: Job | null;
  selectedResume: Resume | null;
  currentProvider: CurrentProvider | null;
  loading: boolean;

  // UI State
  showSettings: boolean;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  expandInterviewGuide: boolean;
  interviewNotesRefreshKey: number;

  // Actions
  setJobs: (jobs: Job[]) => void;
  setResumes: (resumes: Resume[]) => void;
  setSelectedJob: (job: Job | null) => void;
  setSelectedResume: (resume: Resume | null) => void;
  setCurrentProvider: (provider: CurrentProvider | null) => void;
  setLoading: (loading: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setExpandInterviewGuide: (expand: boolean) => void;
  incrementInterviewNotesRefreshKey: () => void;

  // Complex actions
  addJob: (job: Job) => void;
  updateJob: (job: Job) => void;
  deleteJob: (jobId: number) => void;
  addResume: (resume: Resume) => void;
  updateResume: (resume: Resume) => void;
  deleteResume: (resumeId: number) => void;
  selectJob: (job: Job) => void;
  selectResume: (resume: Resume) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  jobs: [],
  resumes: [],
  selectedJob: null,
  selectedResume: null,
  currentProvider: null,
  loading: true,
  showSettings: false,
  sidebarWidth: 256,
  sidebarCollapsed: false,
  expandInterviewGuide: false,
  interviewNotesRefreshKey: 0,

  // Simple setters
  setJobs: (jobs) => set({ jobs }),
  setResumes: (resumes) => set({ resumes }),
  setSelectedJob: (job) => set({ selectedJob: job }),
  setSelectedResume: (resume) => set({ selectedResume: resume }),
  setCurrentProvider: (provider) => set({ currentProvider: provider }),
  setLoading: (loading) => set({ loading }),
  setShowSettings: (show) => set({ showSettings: show }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setExpandInterviewGuide: (expand) => set({ expandInterviewGuide: expand }),
  incrementInterviewNotesRefreshKey: () =>
    set((state) => ({ interviewNotesRefreshKey: state.interviewNotesRefreshKey + 1 })),

  // Complex actions
  addJob: (job) => set((state) => ({
    jobs: [job, ...state.jobs],
    selectedJob: job,
    selectedResume: null
  })),

  updateJob: (job) => set((state) => ({
    jobs: state.jobs.map(j => j.id === job.id ? job : j),
    selectedJob: state.selectedJob?.id === job.id ? job : state.selectedJob
  })),

  deleteJob: (jobId) => set((state) => ({
    jobs: state.jobs.filter(j => j.id !== jobId),
    resumes: state.resumes.filter(r => r.job_id !== jobId),
    selectedJob: state.selectedJob?.id === jobId ? null : state.selectedJob,
    selectedResume: state.selectedResume?.job_id === jobId ? null : state.selectedResume
  })),

  addResume: (resume) => set((state) => ({
    resumes: [resume, ...state.resumes],
    selectedResume: resume
  })),

  updateResume: (resume) => set((state) => ({
    resumes: state.resumes.map(r => r.id === resume.id ? resume : r),
    selectedResume: state.selectedResume?.id === resume.id ? resume : state.selectedResume
  })),

  deleteResume: (resumeId) => set((state) => ({
    resumes: state.resumes.filter(r => r.id !== resumeId),
    selectedResume: state.selectedResume?.id === resumeId ? null : state.selectedResume
  })),

  selectJob: (job) => {
    const { resumes } = get();
    const jobResumes = resumes.filter(r => r.job_id === job.id);
    set({
      selectedJob: job,
      selectedResume: jobResumes.length > 0 ? jobResumes[0] : null
    });
  },

  selectResume: (resume) => {
    const { jobs } = get();
    const job = jobs.find(j => j.id === resume.job_id);
    set({
      selectedResume: resume,
      selectedJob: job || null
    });
  }
}));
