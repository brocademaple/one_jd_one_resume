import { useCallback, useEffect, useState } from 'react';
import type { Job, Resume } from '../types';
import {
  fetchEvaluationScorecard,
  fetchEvaluationScorecardHistory,
  type EvaluationScorecardApiResponse,
} from '../api';
import { handleApiError } from '../utils/errorHandler';

function parseScorecardJson(contentJson: string): EvaluationScorecardApiResponse | null {
  try {
    const data = JSON.parse(contentJson) as EvaluationScorecardApiResponse;
    if (!data || !Array.isArray(data.items)) return null;
    return data;
  } catch {
    return null;
  }
}

export function useCompetencyScorecard(
  job: Job | null,
  resume: Resume | null,
  userBackground?: string,
) {
  const [scorecard, setScorecard] = useState<EvaluationScorecardApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [historyChecked, setHistoryChecked] = useState(false);

  const loadLatest = useCallback(async () => {
    if (!job?.id || !resume?.id) {
      setScorecard(null);
      setHistoryChecked(true);
      return;
    }
    setLoading(true);
    setHistoryChecked(false);
    try {
      const list = await fetchEvaluationScorecardHistory({
        jobId: job.id,
        resumeId: resume.id,
        limit: 1,
      });
      const latest = list[0];
      if (latest?.content_json) {
        const parsed = parseScorecardJson(latest.content_json);
        setScorecard(parsed);
      } else {
        setScorecard(null);
      }
    } catch (err) {
      handleApiError(err, '加载能力评分卡失败');
      setScorecard(null);
    } finally {
      setLoading(false);
      setHistoryChecked(true);
    }
  }, [job?.id, resume?.id]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  const runAnalysis = useCallback(async () => {
    if (!job?.id || !resume?.id) return;
    setRunning(true);
    try {
      const data = await fetchEvaluationScorecard({
        jobId: job.id,
        resumeId: resume.id,
        userBackground: userBackground?.trim() || undefined,
      });
      setScorecard(data);
    } catch (err) {
      handleApiError(err, '能力对照分析失败（请检查模型 API 配置）');
    } finally {
      setRunning(false);
    }
  }, [job?.id, resume?.id, userBackground]);

  return {
    scorecard,
    loading,
    running,
    historyChecked,
    hasAnalysis: !!scorecard?.items?.length,
    reload: loadLatest,
    runAnalysis,
  };
}
