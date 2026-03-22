import {
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
  type CSSProperties,
} from 'react';
import { ResizableDivider } from './ResizableDivider';

const MIN_PANEL_PX = 200;
const DEFAULT_JD = 28;
const DEFAULT_RESUME = 28;
/** 对话栏展开时，JD%+简历% 之和上限，避免两列占满 100% 导致 flex 对话栏宽度为 0 */
const MAX_LEFT_PAIR_PCT = 88;

function clampPercentsForVisibleChat(jd: number, res: number): { jd: number; res: number } {
  const sum = jd + res;
  if (sum <= MAX_LEFT_PAIR_PCT || sum <= 0) return { jd, res };
  const s = MAX_LEFT_PAIR_PCT / sum;
  return { jd: jd * s, res: res * s };
}

export type ResizablePanelsHandle = {
  toggleJd: () => void;
  toggleResume: () => void;
  toggleChat: () => void;
};

export type PanelCollapseState = {
  jdCollapsed: boolean;
  resumeCollapsed: boolean;
  chatCollapsed: boolean;
};

interface ResizablePanelsProps {
  children: [React.ReactNode, React.ReactNode, React.ReactNode];
  onCollapseStateChange?: (s: PanelCollapseState) => void;
}

export const ResizablePanels = forwardRef<ResizablePanelsHandle, ResizablePanelsProps>(
  function ResizablePanels({ children, onCollapseStateChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [jdPercent, setJdPercent] = useState(DEFAULT_JD);
    const [resumePercent, setResumePercent] = useState(DEFAULT_RESUME);
    const [jdCollapsed, setJdCollapsed] = useState(false);
    const [resumeCollapsed, setResumeCollapsed] = useState(false);
    const [chatCollapsed, setChatCollapsed] = useState(false);
    const chatCollapsedRef = useRef(false);
    const resumeCollapsedRef = useRef(false);

    const percentsRef = useRef({ jdPercent, resumePercent });
    percentsRef.current = { jdPercent, resumePercent };

    const percentsBeforeChatCollapseRef = useRef<{ jd: number; res: number } | null>(null);

    useEffect(() => {
      chatCollapsedRef.current = chatCollapsed;
    }, [chatCollapsed]);

    useEffect(() => {
      resumeCollapsedRef.current = resumeCollapsed;
    }, [resumeCollapsed]);

    useEffect(() => {
      onCollapseStateChange?.({
        jdCollapsed,
        resumeCollapsed,
        chatCollapsed,
      });
    }, [jdCollapsed, resumeCollapsed, chatCollapsed, onCollapseStateChange]);

    const clamp = useCallback((p: number) => Math.max(0, Math.min(100, p)), []);

    const handleResize1 = useCallback(
      (delta: number) => {
        if (jdCollapsed || resumeCollapsed) return;
        const el = containerRef.current;
        if (!el) return;
        const total = el.clientWidth;
        const deltaPct = (delta / total) * 100;
        setJdPercent((prev) => clamp(prev + deltaPct));
        setResumePercent((prev) => clamp(prev - deltaPct));
      },
      [clamp, jdCollapsed, resumeCollapsed],
    );

    const handleResize2 = useCallback(
      (delta: number) => {
        const el = containerRef.current;
        if (!el) return;
        const total = el.clientWidth;
        const deltaPct = (delta / total) * 100;

        if (chatCollapsed) {
          if (jdCollapsed) return;
          if (resumeCollapsed) return;
          const { jdPercent: jd0, resumePercent: r0 } = percentsRef.current;
          const nextJd = clamp(jd0 - deltaPct);
          const nextRes = r0 + deltaPct;
          if (nextJd < 8 || nextRes < 8) return;
          setJdPercent(nextJd);
          setResumePercent(nextRes);
          return;
        }

        if (jdCollapsed) return;

        if (resumeCollapsed) {
          const { jdPercent: jd } = percentsRef.current;
          setJdPercent((prev) => clamp(prev - deltaPct));
          return;
        }

        const { jdPercent: jd } = percentsRef.current;
        setResumePercent((prev) => {
          const next = prev + deltaPct;
          const maxResume = Math.max(0, MAX_LEFT_PAIR_PCT - jd);
          return Math.max(0, Math.min(maxResume, next));
        });
      },
      [chatCollapsed, jdCollapsed, resumeCollapsed, clamp],
    );

    const toggleJd = useCallback(() => {
      setJdCollapsed((prev) => {
        if (prev) {
          setJdPercent(DEFAULT_JD);
          setResumePercent(DEFAULT_RESUME);
          setResumeCollapsed(false);
          return false;
        }
        setJdPercent(0);
        if (!resumeCollapsedRef.current) {
          setResumePercent((prevP) => prevP + DEFAULT_JD);
        }
        return true;
      });
    }, []);

    const toggleResume = useCallback(() => {
      setResumeCollapsed((prev) => {
        if (prev) {
          setJdPercent((j) => clamp(j - DEFAULT_RESUME));
          setResumePercent(DEFAULT_RESUME);
          return false;
        }
        if (jdCollapsed) return false;
        setResumePercent(0);
        setJdPercent((j) => j + DEFAULT_RESUME);
        return true;
      });
    }, [jdCollapsed, clamp]);

    const toggleChat = useCallback(() => {
      if (!chatCollapsedRef.current) {
        const { jdPercent: jd, resumePercent: res } = percentsRef.current;
        percentsBeforeChatCollapseRef.current = { jd, res };
        setChatCollapsed(true);
        return;
      }
      const snap = percentsBeforeChatCollapseRef.current;
      percentsBeforeChatCollapseRef.current = null;
      if (snap) {
        const c = clampPercentsForVisibleChat(snap.jd, snap.res);
        setJdPercent(c.jd);
        setResumePercent(c.res);
      } else {
        setJdPercent(DEFAULT_JD);
        setResumePercent(DEFAULT_RESUME);
      }
      setChatCollapsed(false);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        toggleJd,
        toggleResume,
        toggleChat,
      }),
      [toggleJd, toggleResume, toggleChat],
    );

    const jdColumnStyle: CSSProperties = jdCollapsed
      ? { width: 0, minWidth: 0, flex: '0 0 0' }
      : chatCollapsed
        ? {
            width: undefined,
            flexGrow: jdPercent,
            flexShrink: 1,
            flexBasis: 0,
            minWidth: MIN_PANEL_PX,
          }
        : {
            width: `${jdPercent}%`,
            minWidth: MIN_PANEL_PX,
          };

    const resumeColumnStyle: CSSProperties = resumeCollapsed
      ? { width: 0, minWidth: 0, flex: '0 0 0', overflow: 'hidden' }
      : jdCollapsed
        ? chatCollapsed
          ? {
              flex: '1 1 0%',
              minWidth: MIN_PANEL_PX,
              width: undefined,
            }
          : {
              width: `${resumePercent}%`,
              minWidth: MIN_PANEL_PX,
            }
        : chatCollapsed
          ? {
              width: undefined,
              flexGrow: resumePercent,
              flexShrink: 1,
              flexBasis: 0,
              minWidth: MIN_PANEL_PX,
            }
          : {
              width: `${resumePercent}%`,
              minWidth: MIN_PANEL_PX,
            };

    const jdColClass =
      jdCollapsed || !chatCollapsed
        ? 'overflow-hidden shrink-0 transition-all duration-200'
        : 'overflow-hidden min-w-0 transition-all duration-200';

    const resumeColClass = resumeCollapsed
      ? 'overflow-hidden shrink-0 transition-all duration-200'
      : jdCollapsed && !chatCollapsed
        ? 'overflow-hidden shrink-0 transition-all duration-200'
        : jdCollapsed && chatCollapsed
          ? 'overflow-hidden min-w-0 flex-1 basis-0 transition-all duration-200'
          : chatCollapsed
            ? 'overflow-hidden min-w-0 transition-all duration-200'
            : 'overflow-hidden shrink-0 transition-all duration-200';

    return (
      <div ref={containerRef} className="flex-1 flex min-w-0 overflow-hidden" style={{ minWidth: 0 }}>
        <div className={jdColClass} style={jdColumnStyle}>
          {children[0]}
        </div>

        <ResizableDivider
          onResize={handleResize1}
          onToggle={toggleJd}
          collapsed={jdCollapsed}
          toggleAnchor="upper"
          panelLabel="JD 与面试指导"
        />

        <div className={resumeColClass} style={resumeColumnStyle}>
          {children[1]}
        </div>

        <ResizableDivider
          onResize={handleResize2}
          onToggle={toggleChat}
          collapsed={chatCollapsed}
          toggleAnchor="lower"
          panelLabel="求职 Agent 对话"
          collapsesRightPanel
        />

        <div
          className={`overflow-hidden transition-[flex,width,min-width] duration-200 ${chatCollapsed ? 'min-w-0' : 'min-w-[200px] shrink-0'}`}
          style={{
            flex: chatCollapsed ? '0 0 0' : '1 1 0%',
            flexShrink: chatCollapsed ? undefined : 0,
            width: chatCollapsed ? 0 : undefined,
            minWidth: chatCollapsed ? 0 : MIN_PANEL_PX,
          }}
        >
          {children[2]}
        </div>
      </div>
    );
  },
);

ResizablePanels.displayName = 'ResizablePanels';
