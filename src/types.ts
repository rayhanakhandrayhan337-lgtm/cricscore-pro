export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface Player {
  id: string;
  name: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
}

export interface BallEvent {
  id: string;
  ballNumber: number;
  over: number;
  ball: number;
  runs: number;
  isWide: boolean;
  isNoBall: boolean;
  isWicket: boolean;
  wicketType?: 'bowled' | 'caught' | 'lbw' | 'runout' | 'stumped';
  batsmanId: string;
  bowlerId: string;
  timestamp: string;
}

export interface InningsData {
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  extras: {
    wides: number;
    noBalls: number;
  };
  ballEvents: BallEvent[];
  batsmenStats: Record<string, BatsmanStats>;
  bowlersStats: Record<string, BowlerStats>;
  currentBatsmen: [string, string]; // striker, non-striker
  currentBowler: string;
  isCompleted: boolean;
}

export interface BatsmanStats {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
  dismissal?: string;
}

export interface BowlerStats {
  playerId: string;
  playerName: string;
  overs: number;
  balls: number;
  maidens: number;
  runs: number;
  wickets: number;
  extras: number;
}

export interface Match {
  id: string;
  userId: string;
  team1: Team;
  team2: Team;
  venue: string;
  totalOvers: number;
  tossWinner: string;
  tossDecision: 'bat' | 'bowl';
  battingFirst: string;
  innings: InningsData[];
  currentInnings: number;
  status: 'live' | 'completed' | 'upcoming';
  result?: string;
  createdAt: string;
  leagueId?: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

export interface League {
  id: string;
  name: string;
  userId: string;
  teams: LeagueTeam[];
  matches: string[]; // match IDs
  createdAt: string;
}

export interface LeagueTeam {
  id: string;
  name: string;
  players: Player[];
  played: number;
  won: number;
  lost: number;
  points: number;
  nrr: number;
  runsScored: number;
  runsConceded: number;
  oversPlayed: number;
  oversBowled: number;
}

export interface AdminLog {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  adminEmail: string;
}
