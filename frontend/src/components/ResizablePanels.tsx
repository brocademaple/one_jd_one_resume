import { useState, useRef, useCallback } from 'react';
import { ResizableDivider } from './ResizableDivider';

const MIN_PANEL_PX = 200;
const DEFAULT_JD = 28;
const DEFAULT_RESUME = 28;
// Chat 占剩余

interface ResizablePanelsProps {
  children: [React.ReactNode, React.ReactNode, React.ReactNode];
}

export function ResizablePanels({ children }: ResizablePanelsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [jdPercent, setJdPercent] = useState(DEFAULT_JD);
  const [resumePercent, setResumePercent] = useState(DEFAULT_RESUME);
  const [jdCollapsed, setJdCollapsed] = useState(false);
  const [resumeCollapsed, setResumeCollapsed] = useState(false);
  const chatPercent = 100 - jdPercent - resumePercent;

  const percentsRef = useRef({ jdPercent, resumePercent });
  percentsRef.current = { jdPercent, resumePercent };

  const clamp = useCallback((p: number) => Math.max(0, Math.min(100, p)), []);

  const handleResize1 = useCallback(
    (delta: number) => {
      if (jdCollapsed) return;
      const el = containerRef.current;
      if (!el) return;
      const total = el.clientWidth;
      const deltaPct = (delta / total) * 100;
      setJdPercent(prev => clamp(prev + deltaPct));
      setResumePercent(prev => clamp(prev - deltaPct));
    },
    [clamp, jdCollapsed],
  );

  const handleResize2 = useCallback(
    (delta: number) => {
      if (resumeCollapsed) return;
      const el = containerRef.current;
      if (!el) return;
      const total = el.clientWidth;
      const deltaPct = (delta / total) * 100;
      const { jdPercent: jd } = percentsRef.current;
      setResumePercent(prev => {
        const next = prev + deltaPct;
        const maxResume = 100 - jd - 10;
        return Math.max(0, Math.min(maxResume, next));
      });
    },
    [resumeCollapsed],
  );

  const toggleJd = useCallback(() => {
    setJdCollapsed(prev => {
      if (prev) {
        setJdPercent(DEFAULT_JD);
        setResumePercent(DEFAULT_RESUME);
        return false;
      }
      setJdPercent(0);
      setResumePercent(prevP => prevP + DEFAULT_JD);
      return true;
    });
  }, []);

  const toggleResume = useCallback(() => {
    setResumeCollapsed(prev => {
      if (prev) {
        setJdPercent(DEFAULT_JD);
        setResumePercent(DEFAULT_RESUME);
        return false;
      }
      setResumePercent(0);
      setJdPercent(prevP => prevP + DEFAULT_RESUME);
      return true;
    });
  }, []);

  return (
    <div ref={containerRef} className="flex-1 flex min-w-0 overflow-hidden" style={{ minWidth: 0 }}>
      <div
        className="overflow-hidden shrink-0 transition-[width] duration-200"
        style={{
          width: jdCollapsed ? 0 : `${jdPercent}%`,
          minWidth: jdCollapsed ? 0 : MIN_PANEL_PX,
        }}
      >
        {children[0]}
      </div>

      <ResizableDivider onResize={handleResize1} onToggle={toggleJd} collapsed={jdCollapsed} />

      <div
        className="overflow-hidden shrink-0 transition-[width] duration-200"
        style={{
          width: resumeCollapsed ? 0 : `${resumePercent}%`,
          minWidth: resumeCollapsed ? 0 : MIN_PANEL_PX,
        }}
      >
        {children[1]}
      </div>

      <ResizableDivider onResize={handleResize2} onToggle={toggleResume} collapsed={resumeCollapsed} />

      <div
        className="flex-1 overflow-hidden min-w-0 transition-[width] duration-200"
        style={{ minWidth: MIN_PANEL_PX, flex: '1 1 0' }}
      >
        {children[2]}
      </div>
    </div>
  );
}
