// hooks/useScorecardData.ts
'use client';
import { useState, useEffect } from 'react';

interface NormalizedInning {
  batTeamName: string;
  runs: number;
  wickets: number;
  overs: string | number;
  batsmen: any[];
  bowlers: any[];
}

interface NormalizedScorecard {
  scoreCard: NormalizedInning[];
  status?: string;
}

interface UseScorecardDataReturn {
  scorecard: NormalizedScorecard | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useScorecardData = (
  matchId: string | null,
  autoRefresh: boolean = true,
  refreshInterval: number = 60000
): UseScorecardDataReturn => {
  const [scorecard, setScorecard] = useState<NormalizedScorecard | null>(null);
  const [loading, setLoading] = useState(!!matchId);
  const [error, setError] = useState<string | null>(null);

  const fetchScorecard = async () => {
    if (!matchId) {
      setScorecard(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const res = await fetch(`/api/cricket/matches/${matchId}/scorecard`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch scorecard');
      }

      const apiData = json.data;

      // 🔧 Normalize to { scoreCard: [ { batsmen, bowlers, ... } ] }
      const normalized: NormalizedScorecard = {
        scoreCard: (apiData.scorecard || []).map((inning: any) => ({
          batTeamName: inning.batteamname || inning.batteamsname || '',
          runs: inning.score ?? 0,
          wickets: inning.wickets ?? 0,
          overs: inning.overs ?? 0,
          batsmen: inning.batsman || [],
          bowlers: inning.bowler || [],
        })),
        status: apiData.status,
      };

      setScorecard(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setScorecard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!matchId) return;
    fetchScorecard();
    if (autoRefresh) {
      const id = setInterval(fetchScorecard, refreshInterval);
      return () => clearInterval(id);
    }
  }, [matchId, autoRefresh, refreshInterval]);

  return { scorecard, loading, error, refetch: fetchScorecard };
};
