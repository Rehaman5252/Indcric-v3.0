'use client';

import React, { memo } from 'react';

interface TeamsSectionProps {
  teams: any[];
  loading: boolean;
  error: string | null;
}

const TeamsSection = memo(
  ({ teams, loading, error }: TeamsSectionProps) => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-lg h-32 animate-pulse"
            ></div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-red-200">Error: {error}</p>
        </div>
      );
    }

    if (!teams || teams.length === 0) {
      return (
        <div className="bg-gray-900 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-lg">No team data available</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {teams.map((team, index) => (
          <div
            key={index}
            className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors text-center"
          >
            <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {team.rank || index + 1}
              </span>
            </div>
            <h3 className="text-white font-bold text-sm mb-1">
              {team.name || team.teamName || 'Team'}
            </h3>
            {team.country && (
              <p className="text-gray-400 text-xs">{team.country}</p>
            )}
            {team.rating && (
              <p className="text-gray-500 text-xs mt-2">
                Rating: {team.rating}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }
);

TeamsSection.displayName = 'TeamsSection';

export default TeamsSection;
