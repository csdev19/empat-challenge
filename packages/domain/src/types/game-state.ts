/**
 * Game State Types for Word-Picture Match Game
 */

export type GameStatus = "waiting" | "playing" | "paused" | "completed";
export type PlayerRole = "slp" | "student";
export type CardType = "word" | "picture";

export interface CardState {
  id: string;
  type: CardType;
  content: string;
  matchId: string;
  imageUrl?: string;
  flipped: boolean;
  matched: boolean;
  position: number; // Grid position index
}

export interface Match {
  card1Id: string;
  card2Id: string;
  player: PlayerRole;
  correct: boolean;
  timestamp: string; // ISO timestamp
  attemptNumber: number; // Sequential attempt number
}

export interface PlayerScore {
  matches: number;
  attempts: number;
  accuracy: number; // percentage
}

export interface GameState {
  // Game identification
  gameId: string; // UUID
  therapySessionId: string; // Links to therapy session
  gameType: "word-picture-match";

  // Game status
  status: GameStatus;

  // Turn management
  currentPlayer: PlayerRole;
  turnsPlayed: number;

  // Card state
  cardSetId: string; // Which card set is being used
  cards: CardState[];
  flippedCards: string[]; // Currently flipped card IDs (max 2)

  // Match tracking
  matches: Match[];

  // Scoring
  score: {
    slp: PlayerScore;
    student: PlayerScore;
  };

  // Timing
  startedAt: string | null; // ISO timestamp
  completedAt: string | null; // ISO timestamp
  lastActivityAt: string; // ISO timestamp

  // Metadata
  metadata?: {
    difficulty?: string;
    cardSetName?: string;
    shuffleSeed?: number; // For reproducible shuffles
  };
}
