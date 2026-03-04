// components/cricket/CricketNav.tsx
'use client';

import React, { memo } from 'react';

interface CricketNavProps {
  activeTab: 'live' | 'upcoming' | 'recent';
  onTabChange: (tab: 'live' | 'upcoming' | 'recent') => void;
}

const CricketNav = memo(({ activeTab, onTabChange }: CricketNavProps) => {
  const tabs = [
    { id: 'live' as const, label: 'Live', icon: '🔴' },
    { id: 'upcoming' as const, label: 'Upcoming', icon: '📅' },
    { id: 'recent' as const, label: 'Recent', icon: '✅' },
  ];

  return (
    <div className="-mx-2 mb-4 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap flex-1 md:flex-none px-4 py-2 rounded-full font-semibold text-xs md:text-sm transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black shadow-lg shadow-yellow-500/50'
                : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-yellow-500 border border-gray-800'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span>{tab.icon}</span>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

CricketNav.displayName = 'CricketNav';

export default CricketNav;
