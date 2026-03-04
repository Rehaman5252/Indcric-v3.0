export interface CricketMatch {
  matchId: string;
  seriesId: string;
  seriesName: string;
  matchDescription: string;
  matchFormat: 'T20I' | 'ODI' | 'Test' | string;
  matchType: string;
  dls: boolean;
  matchStatus: 'Live' | 'Upcoming' | 'Completed' | 'Recent' | 'In Progress' | 'Preview' | 'Complete' | string;
  team1: CricketTeam;
  team2: CricketTeam;
  venueInfo: VenueInfo;
  statusText: string;
  matchStartDate: number;
}

export interface CricketTeam {
  teamId: number;
  teamName: string;
  teamSName: string;
  imageId: number;
  score?: number;
  wickets?: number;
  overs?: string;
  players?: any[];
}

export interface VenueInfo {
  ground: string;
  city: string;
  timezone: string;
  country?: string;
}

export interface Scorecard {
  scoreCard: InningData[];
  matchInfo?: MatchInfo;
}

export interface InningData {
  inningsId: number;
  batTeamId: number;
  ballTeamId: number;
  batTeamName: string;
  ballTeamName: string;
  runs: number;
  wickets: number;
  overs: number | string;
  isDeclared: boolean;
  isAllOut: boolean;
  batsmans: BatsmanStats[];
  bowlers: BowlerStats[];
}

export interface BatsmanStats {
  batId: number;
  batName: string;
  batShortname: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dots: number;
  strikeRate: number;
  outDesc: string;
}

export interface BowlerStats {
  bowlId: number;
  bowlName: string;
  bowlShortname: string;
  runs: number;
  wickets: number;
  balls: number;
  overs: number;
  maidens: number;
  economy: number;
  dots: number;
}

export interface MatchInfo {
  matchId: string;
  seriesId: string;
  matchDesc: string;
  matchFormat: string;
  team1: CricketTeam;
  team2: CricketTeam;
  state: string;
  status: string;
}

export interface ScheduleItem {
  matchId: string;
  matchDesc: string;
  seriesId: string;
  seriesName: string;
  matchFormat: string;
  startDate: string;
  endDate: string;
  team1: { teamId: number; teamName: string };
  team2: { teamId: number; teamName: string };
  venueInfo: VenueInfo;
}

export interface Series {
  seriesId: string;
  seriesName: string;
  seriesType: string;
  startDate: number;
  endDate: number;
  tourName: string;
  totalMatches: number;
}

export interface CricketTeamInfo {
  teamId: number;
  teamName: string;
  teamSName: string;
  countryName: string;
  imageId: number;
}

export interface CricketApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}
