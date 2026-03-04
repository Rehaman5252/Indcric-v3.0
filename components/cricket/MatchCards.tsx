// components/cricket/MatchCards.tsx
'use client';

import React, { memo, useRef } from 'react';
import MatchCard from './MatchCard';
import { CricketMatch } from '@/types/cricket';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface MatchCardsProps {
  matches: CricketMatch[];
  loading: boolean;
  error: string | null;
  onMatchClick: (match: CricketMatch) => void;
}

const MatchCards = memo(({ matches, loading, error, onMatchClick }: MatchCardsProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 bg-gradient-to-br from-gray-900 to-black rounded-xl border border-gray-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-500 mb-4 mx-auto" />
          <p className="text-gray-400 text-sm">Loading cricket scores...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-950/20 to-black border border-red-900/50 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-red-400 font-semibold mb-2">Failed to load matches</p>
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl p-16 text-center border border-gray-800">
        <div className="text-7xl mb-4">🏏</div>
        <p className="text-gray-400 text-lg font-medium mb-2">No matches available</p>
        <p className="text-gray-600 text-sm">Check back later for live updates</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scroll buttons (desktop / tablet only) */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex items-center justify-center absolute -left-3 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-yellow-500 to-amber-600 text-black p-2 rounded-full shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-110"
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={() => scroll('right')}
        className="hidden md:flex items-center justify-center absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-yellow-500 to-amber-600 text-black p-2 rounded-full shadow-lg hover:shadow-yellow-500/50 transition-all duration-300 hover:scale-110"
        aria-label="Scroll right"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Scrollable container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth px-4 sm:px-10 py-2 -mx-4 sm:mx-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {matches.map((match) => (
          <MatchCard key={match.matchId} match={match} onClick={onMatchClick} />
        ))}
      </div>
    </div>
  );
});

MatchCards.displayName = 'MatchCards';

export default MatchCards;
