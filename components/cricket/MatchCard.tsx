// components/cricket/MatchCard.tsx
'use client';

import React, { memo } from 'react';
import { CricketMatch } from '@/types/cricket';
import { Clock, MapPin } from 'lucide-react';

interface MatchCardProps {
  match: CricketMatch;
  onClick: (match: CricketMatch) => void;
}

const MatchCard = memo(({ match, onClick }: MatchCardProps) => {
  if (!match) return null;

  const isLive =
    match.matchStatus === 'Live' || match.matchStatus === 'In Progress';
  const isCompleted =
    match.matchStatus === 'Completed' ||
    match.matchStatus === 'Recent' ||
    match.matchStatus === 'Complete';
  const isUpcoming =
    match.matchStatus === 'Upcoming' || match.matchStatus === 'Preview';

  const getStatusBadge = () => {
    if (isLive) return 'bg-red-500 text-white animate-pulse';
    if (isCompleted) return 'bg-gray-700 text-gray-300';
    if (isUpcoming) return 'bg-yellow-500 text-black';
    return 'bg-gray-600 text-white';
  };

  const getStatusText = () => {
    if (isLive) return 'LIVE';
    if (isCompleted) return 'ENDED';
    if (isUpcoming) return 'UPCOMING';
    return 'SCHEDULED';
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      onClick={() => onClick(match)}
      className="flex-shrink-0 w-[17.5rem] sm:w-80 bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl border border-yellow-500/20 hover:border-yellow-500/50 cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20 hover:scale-[1.02] overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-amber-600 px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-black font-bold text-xs">
            {match.matchFormat}
          </span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge()}`}
        >
          {getStatusText()}
        </span>
      </div>

      {/* Series */}
      <div className="px-4 py-2 bg-black/50 border-b border-gray-800">
        <p className="text-yellow-500 text-xs truncate font-medium">
          {match.seriesName}
        </p>
      </div>

      {/* Teams */}
      <div className="p-4 space-y-3">
        {/* Team 1 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-black text-[10px] font-bold">
                {match.team1?.teamSName?.substring(0, 2).toUpperCase() || 'T1'}
              </span>
            </div>
            <p className="text-white font-semibold text-sm truncate">
              {match.team1?.teamName || 'Team 1'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {match.team1?.score !== undefined && match.team1?.score >= 0 ? (
              <>
                <p className="text-yellow-400 font-bold text-base">
                  {match.team1.score}/{match.team1.wickets}
                </p>
                {match.team1.overs && (
                  <p className="text-gray-500 text-[10px]">
                    ({match.team1.overs})
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-600 text-sm">-</p>
            )}
          </div>
        </div>

        {/* Team 2 */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-black text-[10px] font-bold">
                {match.team2?.teamSName?.substring(0, 2).toUpperCase() || 'T2'}
              </span>
            </div>
            <p className="text-white font-semibold text-sm truncate">
              {match.team2?.teamName || 'Team 2'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {match.team2?.score !== undefined && match.team2?.score >= 0 ? (
              <>
                <p className="text-yellow-400 font-bold text-base">
                  {match.team2.score}/{match.team2.wickets}
                </p>
                {match.team2.overs && (
                  <p className="text-gray-500 text-[10px]">
                    ({match.team2.overs})
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-600 text-sm">-</p>
            )}
          </div>
        </div>
      </div>

      {/* Status */}
      {match.statusText && (
        <div className="px-4 pb-3">
          <div className="bg-black/50 rounded-lg py-2 px-3 border border-gray-800">
            <p
              className={`text-xs text-center font-medium truncate ${
                isLive ? 'text-yellow-400' : 'text-gray-400'
              }`}
            >
              {match.statusText}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 pb-4 space-y-1">
        {match.venueInfo && (
          <div className="flex items-center gap-1 text-gray-500 text-[10px]">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">
              {match.venueInfo.ground}, {match.venueInfo.city}
            </span>
          </div>
        )}
        {isUpcoming && match.matchStartDate && (
          <div className="flex items-center gap-1 text-yellow-500 text-[10px]">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{formatDate(match.matchStartDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
});

MatchCard.displayName = 'MatchCard';

export default MatchCard;
