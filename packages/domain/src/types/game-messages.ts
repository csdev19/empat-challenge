/**
 * WebSocket Message Types for Word-Picture Choice Game
 */

import type { PlayerRole, Prompt } from "./game-state";

export interface GameMessage {
  type: string;
  payload: unknown;
  timestamp: string; // ISO 8601 timestamp
  player?: PlayerRole; // Only in client → server messages
}

// Client → Server Messages

export interface JoinGameMessage extends GameMessage {
  type: "join-game";
  payload: {
    therapySessionId: string;
    role: PlayerRole;
  };
}

export interface SelectOptionMessage extends GameMessage {
  type: "select-option";
  payload: {
    optionId: string;
  };
  player: "student";
}

export interface NextPromptMessage extends GameMessage {
  type: "next-prompt";
  payload: Record<string, never>;
  player: "slp";
}

export interface EndGameMessage extends GameMessage {
  type: "end-game";
  payload: Record<string, never>;
  player: "slp";
}

// Server → Client Messages

export interface GameStateMessage extends GameMessage {
  type: "game-state";
  payload: import("./game-state").GameState;
}

export interface AnswerResultMessage extends GameMessage {
  type: "answer-result";
  payload: {
    optionId: string;
    correct: boolean;
    attempts: number;
    correctAttempts: number;
  };
}

export interface NewPromptMessage extends GameMessage {
  type: "new-prompt";
  payload: {
    prompt: Prompt;
  };
}

export interface GameCompletedMessage extends GameMessage {
  type: "game-completed";
  payload: {
    attempts: number;
    correctAttempts: number;
    accuracy: number;
    duration: number; // seconds
  };
}

export interface GameErrorMessage extends GameMessage {
  type: "error";
  payload: {
    message: string;
    code?: string;
  };
}

// Union type for all client messages
export type ClientGameMessage =
  | JoinGameMessage
  | SelectOptionMessage
  | NextPromptMessage
  | EndGameMessage;

// Union type for all server messages
export type ServerGameMessage =
  | GameStateMessage
  | AnswerResultMessage
  | NewPromptMessage
  | GameCompletedMessage
  | GameErrorMessage;
