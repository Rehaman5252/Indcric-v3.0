// components/cricket/ScorecardModal.tsx
'use client';

import React, { memo, useState, useMemo } from 'react';
import { X, BarChart3, MessageSquare, Users } from 'lucide-react';
import { useSquadData } from '@/hooks/useSquadData';
import { useCommentary } from '@/hooks/useCommentary';

interface Inning {
  batTeamName: string;
  runs: number;
  wickets: number;
  overs: number | string;
  batsmen: any[];
  bowlers: any[];
}

interface NormalizedScorecard {
  scoreCard: Inning[];
  status?: string;
}

interface MatchMeta {
  matchId: string;
  matchType: 'live' | 'upcoming' | 'recent';
  team1Id: string;
  team1Name: string;
  team2Id: string;
  team2Name: string;
}

interface ScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  scorecard: NormalizedScorecard | null;
  loading: boolean;
  matchType: 'live' | 'upcoming' | 'recent';
  squadsMeta: MatchMeta | null;
}

type TabType = 'scorecard' | 'commentary' | 'squads';

const ScorecardModal = memo(
  ({ isOpen, onClose, scorecard, loading, matchType, squadsMeta }: ScorecardModalProps) => {
    // Smart default tab based on match type
    const defaultTab: TabType = 
      matchType === 'upcoming' ? 'squads' : 
      matchType === 'live' ? 'scorecard' : 
      'scorecard';

    const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
    const [activeInningsIndex, setActiveInningsIndex] = useState(0);
    const [activeSquadTeam, setActiveSquadTeam] = useState<'team1' | 'team2'>('team1');

    // Fetch squads ONLY for upcoming
    const { squads, loading: squadsLoading, error: squadsError } = useSquadData(
      matchType === 'upcoming' ? squadsMeta?.matchId || null : null,
      matchType === 'upcoming' ? squadsMeta?.team1Id || null : null,
      matchType === 'upcoming' ? squadsMeta?.team1Name || null : null,
      matchType === 'upcoming' ? squadsMeta?.team2Id || null : null,
      matchType === 'upcoming' ? squadsMeta?.team2Name || null : null
    );

    // Fetch commentary ONLY for live
    const { commentary, loading: commLoading, error: commError } = useCommentary(
      matchType === 'live' ? squadsMeta?.matchId || null : null,
      matchType === 'live', // Auto-refresh
      10000 // 10 seconds
    );

    const hasInnings = !!scorecard && !!scorecard.scoreCard && scorecard.scoreCard.length > 0;

    const { battingInnings, bowlingInnings } = useMemo(() => {
      if (!hasInnings) return { battingInnings: null, bowlingInnings: null };
      const batting = scorecard!.scoreCard[activeInningsIndex];
      const bowling = scorecard!.scoreCard[activeInningsIndex === 0 ? 1 : 0] ?? null;
      return { battingInnings: batting, bowlingInnings: bowling };
    }, [activeInningsIndex, hasInnings, scorecard]);

    if (!isOpen) return null;

    // Tab configuration based on match type
    const availableTabs: Array<{ id: TabType; label: string; icon: any; emoji: string }> = 
      matchType === 'live' ? [
        { id: 'scorecard', label: 'Scorecard', icon: BarChart3, emoji: '📊' },
        { id: 'commentary', label: 'Commentary', icon: MessageSquare, emoji: '💬' },
      ] :
      matchType === 'upcoming' ? [
        { id: 'squads', label: 'Squads', icon: Users, emoji: '👥' },
      ] :
      [ // recent
        { id: 'scorecard', label: 'Scorecard', icon: BarChart3, emoji: '📊' },
      ];

    // Event emoji helper
    const getEventEmoji = (event?: string) => {
      if (!event) return '⚪';
      if (event.includes('WICKET') || event.includes('W')) return '🔴';
      if (event.includes('FOUR')) return '🟢';
      if (event.includes('SIX')) return '🟣';
      return '⚪';
    };

    return (
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border border-yellow-500/30 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-yellow-500/20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-600 via-yellow-500 to-amber-600 px-6 py-4 flex justify-between items-center sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <span className="text-3xl">
                {matchType === 'live' ? '🔴' : matchType === 'upcoming' ? '📅' : '✅'}
              </span>
              <h2 className="text-black text-xl font-bold">
                {matchType === 'live' ? 'Live Match Centre' : 
                 matchType === 'upcoming' ? 'Upcoming Match' : 
                 'Match Summary'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-black" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="bg-black/40 border-b border-gray-800 px-6 flex gap-2 pt-3">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-yellow-500 text-yellow-500'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <span className="text-lg">{tab.emoji}</span>
                {tab.label}
                {tab.id === 'commentary' && matchType === 'live' && (
                  <span className="ml-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            
            {/* ========== SCORECARD TAB ========== */}
            {activeTab === 'scorecard' && (
              <>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 animate-bounce">🏏</div>
                    <p className="text-gray-400">Loading scorecard...</p>
                  </div>
                ) : !hasInnings ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <p className="text-gray-400">Scorecard not available</p>
                  </div>
                ) : (
                  <>
                    {/* Innings Tabs */}
                    <div className="flex gap-3 mb-6">
                      {scorecard!.scoreCard.map((inn, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveInningsIndex(idx)}
                          className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold border transition-all ${
                            activeInningsIndex === idx
                              ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg'
                              : 'bg-black/40 text-gray-300 border-gray-700 hover:border-yellow-500'
                          }`}
                        >
                          <div className="text-base font-bold">{inn.batTeamName}</div>
                          <div className="text-xs mt-1">
                            {inn.runs}/{inn.wickets} ({inn.overs} ov)
                          </div>
                        </button>
                      ))}
                    </div>

                    {battingInnings && (
                      <div className="space-y-8">
                        {/* Summary Card */}
                        <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/25 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🏏</span>
                            <p className="text-sm uppercase tracking-wide text-gray-400">
                              {battingInnings.batTeamName} Innings
                            </p>
                          </div>
                          <p className="text-white text-2xl font-bold">
                            {battingInnings.runs}/{battingInnings.wickets}
                            <span className="text-sm font-normal text-gray-300 ml-2">
                              ({battingInnings.overs} overs)
                            </span>
                          </p>
                          {scorecard?.status && (
                            <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                              <span>ℹ️</span> {scorecard.status}
                            </p>
                          )}
                        </div>

                        {/* Batting Table */}
                        {battingInnings.batsmen?.length > 0 && (
                          <div>
                            <h3 className="text-yellow-500 font-semibold mb-3 text-sm flex items-center gap-2">
                              <span>🏏</span> Batting
                            </h3>
                            <div className="bg-black/50 border border-gray-800 rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-gradient-to-r from-yellow-600/20 to-amber-600/20">
                                  <tr>
                                    <th className="px-3 py-3 text-left text-yellow-500">Batsman</th>
                                    <th className="px-2 py-3 text-right text-yellow-500">R</th>
                                    <th className="px-2 py-3 text-right text-yellow-500">B</th>
                                    <th className="px-2 py-3 text-right text-yellow-500">4s</th>
                                    <th className="px-2 py-3 text-right text-yellow-500">6s</th>
                                    <th className="px-2 py-3 text-right text-yellow-500">SR</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {battingInnings.batsmen.map((b: any, idx: number) => (
                                    <tr key={idx} className="border-t border-gray-800 hover:bg-yellow-500/5">
                                      <td className="px-3 py-3">
                                        <p className="text-white font-medium">
                                          {b.name}
                                          {b.iscaptain && <span className="text-[10px] text-yellow-400 ml-1">(C)</span>}
                                          {b.iskeeper && <span className="text-[10px] text-blue-400 ml-1">(WK)</span>}
                                        </p>
                                        {b.outdec && <p className="text-gray-500 text-[11px] mt-0.5">{b.outdec}</p>}
                                      </td>
                                      <td className="px-2 py-3 text-right text-yellow-400 font-bold">{b.runs}</td>
                                      <td className="px-2 py-3 text-right text-gray-300">{b.balls}</td>
                                      <td className="px-2 py-3 text-right text-gray-300">{b.fours}</td>
                                      <td className="px-2 py-3 text-right text-gray-300">{b.sixes}</td>
                                      <td className="px-2 py-3 text-right text-gray-300">{b.strkrate}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Bowling Table */}
                        {bowlingInnings?.bowlers?.length > 0 && (
                          <div>
                            <h3 className="text-yellow-500 font-semibold mb-3 text-sm flex items-center gap-2">
                              <span>⚾</span> Bowling
                            </h3>
                            <div className="bg-black/50 border border-gray-800 rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-gradient-to-r from-yellow-600/20 to-amber-600/20">
                                  <tr>
                                    <th className="px-3 py-3 text-left text-yellow-500">Bowler</th>
                                    <th className="px-2 py-3 text-right text-yellow-500">O</th>
                                    <th className="px-2 py-3 text-right text-yellow-500">M</th>
                                    <th className="px-2 py-3 text-right text-yellow-500">R</th>
                                    <th className="px-2 py-3 text-right text-yellow-500">W</th>
                                    <th className="px-2 py-3 text-right text-yellow-500">Econ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bowlingInnings.bowlers.map((bo: any, idx: number) => (
                                    <tr key={idx} className="border-t border-gray-800 hover:bg-yellow-500/5">
                                      <td className="px-3 py-3 text-white font-medium">{bo.name}</td>
                                      <td className="px-2 py-3 text-right text-gray-300">{bo.overs}</td>
                                      <td className="px-2 py-3 text-right text-gray-300">{bo.maidens ?? 0}</td>
                                      <td className="px-2 py-3 text-right text-gray-300">{bo.runs}</td>
                                      <td className="px-2 py-3 text-right text-yellow-400 font-bold">{bo.wickets}</td>
                                      <td className="px-2 py-3 text-right text-gray-300">{bo.economy}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ========== COMMENTARY TAB (LIVE ONLY) ========== */}
            {activeTab === 'commentary' && (
              <div>
                {commLoading && commentary.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4 animate-bounce">💬</div>
                    <p className="text-gray-400">Loading commentary...</p>
                  </div>
                ) : commError ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">⚠️</div>
                    <p className="text-red-400">{commError}</p>
                  </div>
                ) : commentary.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">💬</div>
                    <p className="text-gray-400">Commentary not available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4 text-xs text-gray-400 bg-black/40 px-3 py-2 rounded-lg">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      Live updates every 10 seconds
                    </div>
                    {commentary.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-r from-black/40 to-gray-900/40 border border-gray-800 rounded-lg p-4 hover:border-yellow-500/30 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-yellow-400 text-xs font-bold">
                                  {item.overNumber}.{item.ballNumber}
                                </div>
                                <div className="text-lg">{getEventEmoji(item.event)}</div>
                              </div>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm leading-relaxed">{item.commText}</p>
                            {item.event && item.event !== 'NONE' && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.event.split(',').map((ev, i) => (
                                  <span
                                    key={i}
                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      ev.includes('WICKET') || ev.includes('W')
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                        : ev.includes('SIX')
                                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                                        : ev.includes('FOUR')
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                        : 'bg-gray-700/50 text-gray-300'
                                    }`}
                                  >
                                    {ev.trim()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========== SQUADS TAB (UPCOMING ONLY) ========== */}
            {activeTab === 'squads' && (
              <div>
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={() => setActiveSquadTeam('team1')}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold border transition-all ${
                      activeSquadTeam === 'team1'
                        ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg'
                        : 'bg-black/40 text-gray-300 border-gray-700 hover:border-yellow-500'
                    }`}
                  >
                    <span className="text-lg mr-2">🏏</span>
                    {squads?.team1?.teamName || squadsMeta?.team1Name}
                  </button>
                  <button
                    onClick={() => setActiveSquadTeam('team2')}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold border transition-all ${
                      activeSquadTeam === 'team2'
                        ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg'
                        : 'bg-black/40 text-gray-300 border-gray-700 hover:border-yellow-500'
                    }`}
                  >
                    <span className="text-lg mr-2">🏏</span>
                    {squads?.team2?.teamName || squadsMeta?.team2Name}
                  </button>
                </div>

                {squadsLoading ? (
                  <div className="text-center py-10">
                    <div className="text-6xl mb-4 animate-bounce">👥</div>
                    <p className="text-gray-400">Loading squad...</p>
                  </div>
                ) : squadsError ? (
                  <div className="text-center py-10">
                    <p className="text-red-400">{squadsError}</p>
                  </div>
                ) : (() => {
                    const activeTeam = activeSquadTeam === 'team1' ? squads?.team1 : squads?.team2;
                    if (!activeTeam?.players?.length) {
                      return (
                        <div className="text-center py-10">
                          <div className="text-5xl mb-3">👥</div>
                          <p className="text-gray-400">Squad not available</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        {activeTeam.players.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-start gap-3 bg-black/40 border border-gray-800 rounded-lg p-3 hover:border-yellow-500/30 transition-all"
                          >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 flex items-center justify-center text-xs text-yellow-400 font-bold">
                              {p.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">
                                {p.name}
                                {p.isCaptain && <span className="text-[10px] text-yellow-400 ml-1">👑</span>}
                                {p.isKeeper && <span className="text-[10px] text-blue-400 ml-1">🧤</span>}
                              </p>
                              {p.role && <p className="text-[11px] text-gray-400 mt-0.5">{p.role}</p>}
                              {(p.battingStyle || p.bowlingStyle) && (
                                <p className="text-[10px] text-gray-500 mt-1">
                                  {p.battingStyle}{p.battingStyle && p.bowlingStyle && ' • '}{p.bowlingStyle}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ScorecardModal.displayName = 'ScorecardModal';

export default ScorecardModal;
