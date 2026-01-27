/**
 * Game State Types for Word-Picture Choice Game
 */

export type GameStatus = "waiting" | "active" | "completed";
export type PlayerRole = "slp" | "student";

export interface Option {
  id: string;
  imageUrl: string;
  isCorrect: boolean;
}

export interface Prompt {
  id: string;
  word: string;
  options: Option[];
}

export interface GameState {
  // Game identification
  gameId: string; // UUID
  therapySessionId: string; // Links to therapy session
  gameType: "word-picture-choice";

  // Game status
  status: GameStatus;

  // Current prompt
  currentPrompt: Prompt;

  // Turn (always student's turn in this game)
  turn: "student";

  // Scoring
  attempts: number;
  correctAttempts: number;

  // Last answer
  lastAnswer?: {
    optionId: string;
    correct: boolean;
    timestamp: string;
  };

  // Timing
  startedAt: string | null; // ISO timestamp
  completedAt: string | null; // ISO timestamp
  lastActivityAt: string; // ISO timestamp

  // Metadata
  metadata?: {
    difficulty?: string;
    promptSetName?: string;
    promptSetId?: string;
    totalPrompts?: number;
    currentPromptIndex?: number;
  };
}
