// components/cricket/CricketSection.tsx
'use client';

import React, { useState, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import CricketNav from './CricketNav';
import MatchCards from './MatchCards';
import { useCricketMatches } from '@/hooks/useCricketMatches';
import { useScorecardData } from '@/hooks/useScorecardData';
import { CricketMatch } from '@/types/cricket';

const ScorecardModal = dynamic(() => import('./ScorecardModal'), {
  loading: () => (
    <div className="text-gray-400 text-center py-8">Loading scorecard...</div>
  ),
});

interface CricketSectionProps {
  refreshInterval?: number;
}

interface MatchMeta {
  matchId: string;
  matchType: 'live' | 'upcoming' | 'recent';
  team1Id: string;
  team1Name: string;
  team2Id: string;
  team2Name: string;
}

const CricketSection = memo(({ refreshInterval = 30000 }: CricketSectionProps) => {
  const [activeTab, setActiveTab] = useState<'live' | 'upcoming' | 'recent'>('live');
  const [selectedMatchMeta, setSelectedMatchMeta] = useState<MatchMeta | null>(null);

  const { liveMatches, upcomingMatches, recentMatches, loading, error } = useCricketMatches();

  const { scorecard, loading: scorecardLoading } = useScorecardData(
    selectedMatchMeta?.matchType !== 'upcoming' ? selectedMatchMeta?.matchId || null : null,
    true,
    60000
  );

  const handleTabChange = useCallback((tab: 'live' | 'upcoming' | 'recent') => {
    setActiveTab(tab);
  }, []);

  const handleMatchClick = useCallback((match: CricketMatch) => {
    setSelectedMatchMeta({
      matchId: match.matchId,
      matchType: activeTab,
      team1Id: String(match.team1?.teamId || ''),
      team1Name: match.team1?.teamName || '',
      team2Id: String(match.team2?.teamId || ''),
      team2Name: match.team2?.teamName || '',
    });
  }, [activeTab]);

  const handleCloseScorecard = useCallback(() => {
    setSelectedMatchMeta(null);
  }, []);

  const getCurrentMatches = () => {
    switch (activeTab) {
      case 'live':
        return liveMatches;
      case 'upcoming':
        return upcomingMatches;
      case 'recent':
        return recentMatches;
      default:
        return [];
    }
  };

  const getCurrentLoading = () => {
    switch (activeTab) {
      case 'live':
        return loading.live;
      case 'upcoming':
        return loading.upcoming;
      case 'recent':
        return loading.recent;
      default:
        return false;
    }
  };

  const getCurrentError = () => {
    switch (activeTab) {
      case 'live':
        return error.live;
      case 'upcoming':
        return error.upcoming;
      case 'recent':
        return error.recent;
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
<h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 bg-clip-text text-transparent mb-2">
  🏏 Cricket Live Scores
</h2>

        <p className="text-gray-500 text-sm">Stay updated with real-time cricket action</p>
      </div>

      {/* Navigation */}
      <CricketNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Matches Display */}
      <div className="min-h-[320px]">
        <MatchCards
          matches={getCurrentMatches()}
          loading={getCurrentLoading()}
          error={getCurrentError()}
          onMatchClick={handleMatchClick}
        />
      </div>

      {/* Scorecard Modal */}
      <ScorecardModal
        isOpen={!!selectedMatchMeta}
        onClose={handleCloseScorecard}
        scorecard={scorecard}
        loading={scorecardLoading}
        matchType={selectedMatchMeta?.matchType || 'live'}
        squadsMeta={selectedMatchMeta}
      />
    </div>
  );
});

CricketSection.displayName = 'CricketSection';

export default CricketSection;
