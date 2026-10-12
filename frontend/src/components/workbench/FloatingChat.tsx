import { MessageCircle, X, Minus } from 'lucide-react';
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
      className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] h-[min(420px,calc(100vh-6rem))] ojor-glass rounded-2xl overflow-hidden flex flex-col shadow-xl"
    >
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/50 bg-white/30">
        <span className="text-[12px] font-semibold text-slate-900">对照助手</span>
        <div className="flex gap-1">
          <button
            type="button"
            className="p-1 rounded-md hover:bg-white/50 text-slate-600"
            aria-label="最小化"
            onClick={() => setChatExpanded(false)}
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            className="p-1 rounded-md hover:bg-white/50 text-slate-600"
            aria-label="关闭"
            onClick={() => setChatExpanded(false)}
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 [&_.panel-header]:hidden [&>div]:h-full">
        <ChatPanel {...props} />
      </div>
    </div>
  );
}
