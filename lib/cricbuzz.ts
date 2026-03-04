// lib/cricbuzz.ts
import { CricketMatch, Scorecard } from '@/types/cricket';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'cricbuzz-cricket.p.rapidapi.com';

interface CricbuzzResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class CricbuzzService {
  private async fetchFromApi(endpoint: string): Promise<any> {
    try {
      if (!RAPIDAPI_KEY) {
        throw new Error('RAPIDAPI_KEY not found in environment variables');
      }

      const url = `https://${RAPIDAPI_HOST}${endpoint}`;
      console.log('🌐 Fetching:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST,
        },
        next: { revalidate: 30 },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, response.statusText, errorText);
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ API Response received');
      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }

  private parseMatchData(rawMatch: any): CricketMatch | null {
    try {
      const { matchInfo, matchScore } = rawMatch;
      if (!matchInfo) return null;

      const team1Score = matchScore?.team1Score?.inngs1;
      const team2Score = matchScore?.team2Score?.inngs1;

      return {
        matchId: matchInfo.matchId?.toString(),
        seriesId: matchInfo.seriesId?.toString(),
        seriesName: matchInfo.seriesName,
        matchDescription: matchInfo.matchDesc,
        matchFormat: matchInfo.matchFormat,
        matchType: matchInfo.matchType,
        dls: matchInfo.dls || false,
        matchStatus: matchInfo.state,
        team1: {
          teamId: matchInfo.team1?.teamId || 0,
          teamName: matchInfo.team1?.teamName,
          teamSName: matchInfo.team1?.teamSName,
          imageId: matchInfo.team1?.imageId || 0,
          score: team1Score?.runs || 0,
          wickets: team1Score?.wickets || 0,
          overs: team1Score?.overs?.toString() || '0',
        },
        team2: {
          teamId: matchInfo.team2?.teamId || 0,
          teamName: matchInfo.team2?.teamName,
          teamSName: matchInfo.team2?.teamSName,
          imageId: matchInfo.team2?.imageId || 0,
          score: team2Score?.runs || 0,
          wickets: team2Score?.wickets || 0,
          overs: team2Score?.overs?.toString() || '0',
        },
        venueInfo: {
          ground: matchInfo.venueInfo?.ground,
          city: matchInfo.venueInfo?.city,
          timezone: matchInfo.venueInfo?.timezone,
          country: matchInfo.venueInfo?.country,
        },
        statusText: matchInfo.status,
        matchStartDate: matchInfo.startDate ? parseInt(matchInfo.startDate) / 1000 : Date.now() / 1000,
      };
    } catch (error) {
      console.error('Error parsing match:', error);
      return null;
    }
  }

  private extractMatches(apiResponse: any, filterState?: string): CricketMatch[] {
    const matches: CricketMatch[] = [];
    console.log('📊 Extracting matches...');

    if (!apiResponse?.typeMatches) {
      console.log('No typeMatches in response');
      return matches;
    }

    let totalFound = 0;
    let totalParsed = 0;

    for (const typeMatch of apiResponse.typeMatches) {
      if (!typeMatch.seriesMatches) continue;

      for (const seriesMatch of typeMatch.seriesMatches) {
        if (seriesMatch.ad) continue;

        const wrapper = seriesMatch.seriesAdWrapper;
        if (!wrapper?.matches) continue;

        console.log(`📌 Series: ${wrapper.seriesName} (${wrapper.matches.length} matches)`);

        for (const rawMatch of wrapper.matches) {
          const matchInfo = rawMatch.matchInfo;
          if (!matchInfo) continue;

          totalFound++;

          if (filterState && matchInfo.state !== filterState) {
            console.log(`⏭️  Skip: ${matchInfo.matchDesc} - state ${matchInfo.state} (wanted ${filterState})`);
            continue;
          }

          const parsedMatch = this.parseMatchData(rawMatch);
          if (parsedMatch) {
            matches.push(parsedMatch);
            totalParsed++;
            console.log(`✅ Added: ${matchInfo.team1.teamSName} vs ${matchInfo.team2.teamSName}`);
          }
        }
      }
    }

    console.log(`📦 Extracted ${matches.length} matches (found ${totalFound}, parsed ${totalParsed})`);
    return matches;
  }

  // ✅ EXISTING WORKING METHODS
  async getLiveMatches(): Promise<CricbuzzResponse<CricketMatch[]>> {
    try {
      const data = await this.fetchFromApi('/matches/v1/live');
      const matches = this.extractMatches(data, 'In Progress');
      return { success: true, data: matches };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch live matches',
      };
    }
  }

  async getUpcomingMatches(): Promise<CricbuzzResponse<CricketMatch[]>> {
    try {
      const data = await this.fetchFromApi('/matches/v1/upcoming');
      const matches = this.extractMatches(data, 'Preview');
      return { success: true, data: matches };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch upcoming matches',
      };
    }
  }

  async getRecentMatches(): Promise<CricbuzzResponse<CricketMatch[]>> {
    try {
      const data = await this.fetchFromApi('/matches/v1/recent');
      const matches = this.extractMatches(data, 'Complete');
      return { success: true, data: matches };
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch recent matches',
      };
    }
  }

  // 🆕 NEW METHODS FOR MATCH DETAILS
  async getMatchInfo(matchId: string): Promise<CricbuzzResponse<any>> {
    try {
      console.log(`📖 Fetching match info for: ${matchId}`);
      const data = await this.fetchFromApi(`/mcenter/v1/${matchId}`);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch match info',
      };
    }
  }

  async getScorecard(matchId: string): Promise<CricbuzzResponse<any>> {
    try {
      console.log(`📊 Fetching scorecard for: ${matchId}`);
      const data = await this.fetchFromApi(`/mcenter/v1/${matchId}/scard`);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch scorecard',
      };
    }
  }

  async getCommentary(matchId: string): Promise<CricbuzzResponse<any>> {
    try {
      console.log(`💬 Fetching commentary for: ${matchId}`);
      const data = await this.fetchFromApi(`/mcenter/v1/${matchId}/comm`);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch commentary',
      };
    }
  }

  async getTeamLineup(matchId: string, teamId: string): Promise<CricbuzzResponse<any>> {
    try {
      console.log(`👥 Fetching team lineup for match: ${matchId}, team: ${teamId}`);
      const data = await this.fetchFromApi(`/mcenter/v1/${matchId}/team/${teamId}`);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch team lineup',
      };
    }
  }

  async getOvers(matchId: string): Promise<CricbuzzResponse<any>> {
    try {
      console.log(`⏱️ Fetching overs for: ${matchId}`);
      const data = await this.fetchFromApi(`/mcenter/v1/${matchId}/overs`);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch overs',
      };
    }
  }

  // 🆕 SQUAD FETCHING METHOD (NEW!)
  async getTeamSquad(matchId: string, teamId: string): Promise<CricbuzzResponse<any>> {
    try {
      console.log(`👥 Fetching squad for match ${matchId}, team ${teamId}`);
      const data = await this.fetchFromApi(`/mcenter/v1/${matchId}/team/${teamId}`);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch team squad',
      };
    }
  }

  // Keep existing methods for schedule, series, teams
  async getSchedule(): Promise<CricbuzzResponse<any>> {
    try {
      const data = await this.fetchFromApi('/schedule/v1/international');
      return { success: true, data: data.matchScheduleMap };
    } catch (error) {
      return { success: true, data: [], error: error instanceof Error ? error.message : 'Failed to fetch schedule' };
    }
  }

  async getSeries(): Promise<CricbuzzResponse<any>> {
    try {
      const data = await this.fetchFromApi('/series/v1/international');
      return { success: true, data: data.seriesMapProto };
    } catch (error) {
      return { success: true, data: [], error: error instanceof Error ? error.message : 'Failed to fetch series' };
    }
  }

  async getTeams(): Promise<CricbuzzResponse<any>> {
    try {
      const data = await this.fetchFromApi('/stats/v1/rankings/batsmen?formatType=test');
      return { success: true, data: data.rank };
    } catch (error) {
      return { success: true, data: [], error: error instanceof Error ? error.message : 'Failed to fetch teams' };
    }
  }
}

export const cricbuzzService = new CricbuzzService();
