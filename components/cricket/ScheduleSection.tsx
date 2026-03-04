'use client';

import React, { memo } from 'react';
import { ScheduleItem } from '@/types/cricket';

interface ScheduleSectionProps {
  schedule: ScheduleItem[];
  loading: boolean;
  error: string | null;
}

const ScheduleSection = memo(
  ({ schedule, loading, error }: ScheduleSectionProps) => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-lg h-24 animate-pulse"
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

    if (!schedule || schedule.length === 0) {
      return (
        <div className="bg-gray-900 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-lg">No scheduled matches</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {schedule.map((item) => (
          <div
            key={item.matchId}
            className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-white font-bold text-sm">
                  {item.team1?.teamName || 'Team 1'} vs {item.team2?.teamName || 'Team 2'}
                </p>
                <p className="text-gray-400 text-xs">{item.seriesName}</p>
              </div>
              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                {item.matchFormat}
              </span>
            </div>
            <div className="text-gray-500 text-xs">
              <p>📅 {new Date(item.startDate).toLocaleDateString()}</p>
              {item.venueInfo && (
                <p className="mt-1">
                  📍 {item.venueInfo.ground}, {item.venueInfo.city}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

ScheduleSection.displayName = 'ScheduleSection';

export default ScheduleSection;
