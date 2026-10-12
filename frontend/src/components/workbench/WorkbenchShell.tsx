import { WorkbenchHeader } from './WorkbenchHeader';
import { JobLibrarySidebar } from './JobLibrarySidebar';
import { MainWorkbenchArea } from './MainWorkbenchArea';
import { FloatingChat } from './FloatingChat';
import type { Job, Resume, CurrentProvider } from '../../types';
import type { BackgroundProfilesController } from '../../hooks/useBackgroundProfiles';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';

export interface WorkbenchShellProps {
  jobs: Job[];
  resumes: Resume[];
  selectedJob: Job | null;
  selectedResume: Resume | null;
  currentProvider: CurrentProvider | null;
  onSelectJob: (job: Job) => void;
  onJobCreated: (job: Job) => void;
  onJobDeleted: (jobId: number) => void;
  onResumeUpdated: (resume: Resume) => void;
  onResumeCreated: (resume: Resume) => void;
  onNewResume: (jobId: number) => void;
  onOpenBackground: () => void;
  onOpenSettings: () => void;
  bg: BackgroundProfilesController;
  interviewNotesRefreshKey: number;
  canStartSimulation: boolean;
  onStartInterviewSim: (preferredCategories: string[] | null) => void;
  onExport: () => void;
  onQuestionBank: () => void;
  onMockInterview: () => void;
  onPreApplyGuidance: () => void;
  onInterviewNoteAdded?: () => void;
}

export function WorkbenchShell(props: WorkbenchShellProps) {
  const {
    jobs,
    resumes,
    selectedJob,
    selectedResume,
    currentProvider,
    onSelectJob,
    onJobCreated,
    onJobDeleted,
    onResumeUpdated,
    onResumeCreated,
    onNewResume,
    onOpenBackground,
    onOpenSettings,
    bg,
    interviewNotesRefreshKey,
    canStartSimulation,
    onStartInterviewSim,
    onExport,
    onQuestionBank,
    onMockInterview,
    onPreApplyGuidance,
    onInterviewNoteAdded,
  } = props;

  const jobLibraryIconStrip = useWorkbenchStore((s) => s.jobLibraryIconStrip);

  return (
    <div className="h-full w-full flex flex-col ojor-workbench-bg overflow-hidden">
      <WorkbenchHeader
        bg={bg}
        onOpenBackground={onOpenBackground}
        onExport={onExport}
        onQuestionBank={onQuestionBank}
        onMockInterview={onMockInterview}
        onPreApplyGuidance={onPreApplyGuidance}
      />
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <JobLibrarySidebar
          jobs={jobs}
          resumes={resumes}
          selectedJobId={selectedJob?.id ?? null}
          iconStrip={jobLibraryIconStrip}
          onSelectJob={onSelectJob}
          onJobCreated={onJobCreated}
          onJobDeleted={onJobDeleted}
          currentProvider={currentProvider}
          onOpenSettings={onOpenSettings}
        />
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <MainWorkbenchArea
            job={selectedJob}
            resumes={resumes}
            selectedResume={selectedResume}
            onResumeUpdated={onResumeUpdated}
            onNewResume={onNewResume}
            interviewNotesRefreshKey={interviewNotesRefreshKey}
            canStartSimulation={canStartSimulation}
            backgroundProfileId={bg.activeProfileId}
            onStartInterviewSim={onStartInterviewSim}
          />
        </main>
      </div>
      <FloatingChat
        jobId={selectedJob?.id ?? null}
        jobTitle={selectedJob?.title ?? null}
        jobCompany={selectedJob?.company ?? null}
        resumeId={selectedResume?.id ?? null}
        onResumeCreated={onResumeCreated}
        onResumeUpdated={onResumeUpdated}
        onInterviewNoteAdded={onInterviewNoteAdded}
        currentProvider={currentProvider}
        onOpenSettings={onOpenSettings}
        bg={bg}
      />
    </div>
  );
}
