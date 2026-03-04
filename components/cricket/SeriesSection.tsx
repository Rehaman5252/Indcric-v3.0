'use client';

import React, { memo } from 'react';

interface SeriesSectionProps {
  series: any[];
  loading: boolean;
  error: string | null;
}

const SeriesSection = memo(
  ({ series, loading, error }: SeriesSectionProps) => {
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

    if (!series || series.length === 0) {
      return (
        <div className="bg-gray-900 rounded-lg p-8 text-center">
          <p className="text-gray-400 text-lg">No active series</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {series.map((item, index) => (
          <div
            key={index}
            className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors"
          >
            <h3 className="text-white font-bold text-sm mb-2">
              {item.seriesName || 'Series'}
            </h3>
            <div className="text-gray-400 text-xs space-y-1">
              {item.seriesType && (
                <p>🏆 Type: {item.seriesType}</p>
              )}
              {item.totalMatches && (
                <p>🎯 Total Matches: {item.totalMatches}</p>
              )}
              {item.startDate && (
                <p>
                  📅 {new Date(item.startDate).toLocaleDateString()} - {' '}
                  {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'TBD'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
);

SeriesSection.displayName = 'SeriesSection';

export default SeriesSection;
