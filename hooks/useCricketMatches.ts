'use client';

import { useState, useEffect } from 'react';
import { CricketMatch } from '@/types/cricket';

interface UseCricketMatchesState {
  liveMatches: CricketMatch[];
  upcomingMatches: CricketMatch[];
  recentMatches: CricketMatch[];
  loading: {
    live: boolean;
    upcoming: boolean;
    recent: boolean;
  };
  error: {
    live: string | null;
    upcoming: string | null;
    recent: string | null;
  };
  refetch: () => void;
}

export const useCricketMatches = (): UseCricketMatchesState => {
  const [liveMatches, setLiveMatches] = useState<CricketMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<CricketMatch[]>([]);
  const [recentMatches, setRecentMatches] = useState<CricketMatch[]>([]);
  
  const [loading, setLoading] = useState({
    live: true,
    upcoming: true,
    recent: true,
  });
  
  const [error, setError] = useState<{
    live: string | null;
    upcoming: string | null;
    recent: string | null;
  }>({
    live: null,
    upcoming: null,
    recent: null,
  });

  const fetchMatches = async (type: 'live' | 'upcoming' | 'recent') => {
    try {
      setLoading(prev => ({ ...prev, [type]: true }));
      setError(prev => ({ ...prev, [type]: null }));

      const response = await fetch(`/api/cricket/matches?type=${type}`);
      const result = await response.json();

      if (result.success && result.data) {
        switch (type) {
          case 'live':
            setLiveMatches(result.data);
            break;
          case 'upcoming':
            setUpcomingMatches(result.data);
            break;
          case 'recent':
            setRecentMatches(result.data);
            break;
        }
        console.log(`✅ Loaded ${result.data.length} ${type} matches`);
      } else {
        setError(prev => ({ ...prev, [type]: result.error || 'Failed to fetch matches' }));
      }
    } catch (err) {
      console.error(`Error fetching ${type} matches:`, err);
      setError(prev => ({ ...prev, [type]: err instanceof Error ? err.message : 'An error occurred' }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const refetch = () => {
    fetchMatches('live');
    fetchMatches('upcoming');
    fetchMatches('recent');
  };

  useEffect(() => {
    fetchMatches('live');
    fetchMatches('upcoming');
    fetchMatches('recent');

    // Auto-refresh live matches every 30 seconds
    const interval = setInterval(() => {
      fetchMatches('live');
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    liveMatches,
    upcomingMatches,
    recentMatches,
    loading,
    error,
    refetch,
  };
};
