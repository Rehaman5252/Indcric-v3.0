// hooks/useCommentary.ts
'use client';

import { useState, useEffect } from 'react';

interface CommentaryItem {
  overNumber: string;
  ballNumber: number;
  commText: string;
  timestamp: number;
  event?: string;
  runs?: number;
}

interface UseCommentaryReturn {
  commentary: CommentaryItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCommentary(
  matchId: string | null,
  autoRefresh: boolean = false,
  refreshInterval: number = 10000
): UseCommentaryReturn {
  const [commentary, setCommentary] = useState<CommentaryItem[]>([]);
  const [loading, setLoading] = useState(!!matchId);
  const [error, setError] = useState<string | null>(null);

  const fetchCommentary = async () => {
    if (!matchId) {
      setCommentary([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const res = await fetch(`/api/cricket/matches/${matchId}/commentary`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch commentary');
      }

      const rawData = json.data;
      const items: CommentaryItem[] = [];

      // Parse from actual Cricbuzz structure: comwrapper[].commentary
      if (rawData?.comwrapper && Array.isArray(rawData.comwrapper)) {
        for (const wrapper of rawData.comwrapper) {
          const comm = wrapper.commentary;
          if (comm && comm.commtxt) {
            // Clean text - remove B0$ placeholders
            const cleanText = comm.commtxt.replace(/B0\$/g, '');
            
            items.push({
              overNumber: String(comm.overnum || 0),
              ballNumber: comm.ballnbr || 0,
              commText: cleanText.trim(),
              timestamp: comm.timestamp || Date.now(),
              event: comm.eventtype || undefined,
            });
          }
        }
      }

      setCommentary(items);
    } catch (err) {
      console.error('❌ Commentary fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load commentary');
      setCommentary([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommentary();

    if (autoRefresh && matchId) {
      const interval = setInterval(fetchCommentary, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [matchId, autoRefresh, refreshInterval]);

  return { commentary, loading, error, refetch: fetchCommentary };
}
