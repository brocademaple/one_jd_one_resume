import { useState, useCallback, useEffect, useRef } from 'react';
import { JDPanel } from './JDPanel';
import { InterviewGuidePanel } from './InterviewGuidePanel';
import { HorizontalResizableDivider } from './HorizontalResizableDivider';
import type { Job } from '../types';

const MIN_JD_HEIGHT_PCT = 25;
const MAX_JD_HEIGHT_PCT = 85;
const DEFAULT_JD_HEIGHT_PCT = 55;

interface JDAndInterviewGuideColumnProps {
  job: Job | null;
  onJobUpdated: (job: Job) => void;
  expandInterviewGuide?: boolean;
  interviewNotesRefreshKey?: number;
}

export function JDAndInterviewGuideColumn({
  job,
  onJobUpdated,
  expandInterviewGuide = false,
  interviewNotesRefreshKey = 0,
}: JDAndInterviewGuideColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [jdHeightPct, setJdHeightPct] = useState(DEFAULT_JD_HEIGHT_PCT);
  const [interviewGuideCollapsed, setInterviewGuideCollapsed] = useState(false);

  useEffect(() => {
    if (expandInterviewGuide) setInterviewGuideCollapsed(false);
  }, [expandInterviewGuide]);

  const handleResize = useCallback((deltaY: number) => {
    setJdHeightPct(prev => {
      const totalH = columnRef.current?.clientHeight ?? 0;
      if (totalH <= 0) return prev;
      const deltaPct = (deltaY / totalH) * 100;
      const next = prev + deltaPct;
      return Math.max(MIN_JD_HEIGHT_PCT, Math.min(MAX_JD_HEIGHT_PCT, next));
    });
  }, []);

  const toggleInterviewGuide = useCallback(() => {
    setInterviewGuideCollapsed(c => {
      if (c) {
        setJdHeightPct(DEFAULT_JD_HEIGHT_PCT);
        return false;
      }
      setJdHeightPct(100);
      return true;
    });
  }, []);

  return (
    <div ref={columnRef} className="flex flex-col h-full min-h-0 overflow-hidden">
      <div
        className="min-h-0 overflow-hidden transition-[flex] duration-200"
        style={{
          flex: interviewGuideCollapsed ? '1 1 100%' : `${jdHeightPct} 1 0`,
          minHeight: interviewGuideCollapsed ? undefined : 120,
        }}
      >
        <JDPanel job={job} onJobUpdated={onJobUpdated} />
      </div>

      <HorizontalResizableDivider
        onResize={handleResize}
        onToggle={toggleInterviewGuide}
        collapsed={interviewGuideCollapsed}
      />

      <div
        className="min-h-0 overflow-hidden transition-[flex] duration-200"
        style={{
          flex: interviewGuideCollapsed ? '0 0 0' : `${100 - jdHeightPct} 1 0`,
          minHeight: interviewGuideCollapsed ? 0 : 120,
        }}
      >
        <InterviewGuidePanel jobId={job?.id ?? null} refreshKey={interviewNotesRefreshKey} />
      </div>
    </div>
  );
}
