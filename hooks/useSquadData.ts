// hooks/useSquadData.ts
'use client';

import { useState, useEffect } from 'react';

interface SquadPlayer {
  id: number;
  name: string;
  role?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  isCaptain?: boolean;
  isKeeper?: boolean;
}

interface TeamSquad {
  teamId: string;
  teamName: string;
  shortName?: string;
  players: SquadPlayer[];
}

interface SquadData {
  team1: TeamSquad | null;
  team2: TeamSquad | null;
}

interface UseSquadDataReturn {
  squads: SquadData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSquadData(
  matchId: string | null,
  team1Id: string | null,
  team1Name: string | null,
  team2Id: string | null,
  team2Name: string | null
): UseSquadDataReturn {
  const [squads, setSquads] = useState<SquadData | null>(null);
  const [loading, setLoading] = useState(!!matchId);
  const [error, setError] = useState<string | null>(null);

  const fetchSquads = async () => {
    if (!matchId || !team1Id || !team2Id) {
      setSquads(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const res = await fetch(
        `/api/cricket/matches/${matchId}/squad?team1Id=${team1Id}&team2Id=${team2Id}`
      );
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch squads');
      }

      const mapTeam = (raw: any, id: string, name: string | null): TeamSquad | null => {
        if (!raw) return null;

        // 🔥 FIX: Extract from nested structure
        // raw.player is an array with categories: [{ player: [...], category: "Squad" }, { player: [...], category: "support staff" }]
        let playerList: any[] = [];

        if (Array.isArray(raw.player)) {
          // Find the "Squad" category
          const squadCategory = raw.player.find((cat: any) => cat.category === 'Squad');
          if (squadCategory && Array.isArray(squadCategory.player)) {
            playerList = squadCategory.player;
          }
        }

        if (playerList.length === 0) {
          console.warn(`No squad players found for team ${name}`);
          return null;
        }

        const players: SquadPlayer[] = playerList.map((p: any) => ({
          id: p.id || p.playerId,
          name: p.name || p.fullName || 'Unknown',
          role: p.role || p.playingRole || '',
          battingStyle: p.bat || p.battingStyle || '',
          bowlingStyle: p.bowl || p.bowlingStyle || '',
          isCaptain: p.captain || p.iscaptain || p.isCaptain || false,
          isKeeper: p.keeper || p.iskeeper || p.isKeeper || false,
        }));

        return {
          teamId: id,
          teamName: name || raw.name || '',
          shortName: raw.teamSName || raw.shortName,
          players,
        };
      };

      setSquads({
        team1: mapTeam(json.data.team1, team1Id, team1Name),
        team2: mapTeam(json.data.team2, team2Id, team2Name),
      });
    } catch (err) {
      console.error('❌ Squad fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load squads');
      setSquads(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSquads();
  }, [matchId, team1Id, team2Id]);

  return { squads, loading, error, refetch: fetchSquads };
}
