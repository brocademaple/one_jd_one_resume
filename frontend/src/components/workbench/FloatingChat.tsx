import { MessageCircle, Minus } from 'lucide-react';
import { ChatPanel } from '../ChatPanel';
import type { Resume, CurrentProvider } from '../../types';
import type { BackgroundProfilesController } from '../../hooks/useBackgroundProfiles';
import { useWorkbenchStore } from '../../store/useWorkbenchStore';

interface FloatingChatProps {
  jobId: number | null;
  jobTitle?: string | null;
  jobCompany?: string | null;
  resumeId: number | null;
  onResumeCreated: (resume: Resume) => void;
  onResumeUpdated: (resume: Resume) => void;
  onInterviewNoteAdded?: () => void;
  currentProvider?: CurrentProvider | null;
  onOpenSettings?: () => void;
  bg: BackgroundProfilesController;
}

export function FloatingChat(props: FloatingChatProps) {
  const { chatExpanded, setChatExpanded } = useWorkbenchStore();

  if (!chatExpanded) {
    return (
      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-primary-600 text-white shadow-lg ojor-bubble flex items-center justify-center hover:bg-primary-700"
        aria-label="打开对照助手"
        onClick={() => setChatExpanded(true)}
      >
        <MessageCircle size={22} />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] h-[min(440px,calc(100vh-6rem))] ojor-glass rounded-2xl overflow-hidden flex flex-col shadow-xl"
    >
      <button
        type="button"
        className="absolute top-1.5 right-1.5 z-10 p-1 rounded-md bg-white/70 hover:bg-white text-slate-600 shadow-sm"
        aria-label="最小化对话"
        onClick={() => setChatExpanded(false)}
      >
        <Minus size={16} />
      </button>
      <div className="flex-1 min-h-0 [&>div]:h-full">
        <ChatPanel {...props} assistantTitle="对照助手" />
      </div>
    </div>
  );
}
