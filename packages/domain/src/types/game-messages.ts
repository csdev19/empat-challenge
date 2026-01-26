/**
 * WebSocket Message Types for Word-Picture Match Game
 */

import type { PlayerRole } from "./game-state";

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

export interface FlipCardMessage extends GameMessage {
  type: "flip-card";
  payload: {
    cardId: string;
  };
  player: PlayerRole;
}

export interface CheckMatchMessage extends GameMessage {
  type: "check-match";
  payload: {
    card1Id: string;
    card2Id: string;
  };
  player: PlayerRole;
}

export interface EndTurnMessage extends GameMessage {
  type: "end-turn";
  payload: Record<string, never>;
  player: PlayerRole;
}

export interface PauseGameMessage extends GameMessage {
  type: "pause-game";
  payload: Record<string, never>;
  player: "slp";
}

export interface ResumeGameMessage extends GameMessage {
  type: "resume-game";
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

export interface CardFlippedMessage extends GameMessage {
  type: "card-flipped";
  payload: {
    cardId: string;
    player: PlayerRole;
  };
}

export interface MatchResultMessage extends GameMessage {
  type: "match-result";
  payload: {
    card1Id: string;
    card2Id: string;
    correct: boolean;
    player: PlayerRole;
    newScore: {
      slp: { matches: number; attempts: number; accuracy: number };
      student: { matches: number; attempts: number; accuracy: number };
    };
  };
}

export interface TurnChangedMessage extends GameMessage {
  type: "turn-changed";
  payload: {
    currentPlayer: PlayerRole;
    reason: "incorrect-match" | "end-turn" | "game-start";
  };
}

export interface GameCompletedMessage extends GameMessage {
  type: "game-completed";
  payload: {
    finalScore: {
      slp: { matches: number; attempts: number; accuracy: number };
      student: { matches: number; attempts: number; accuracy: number };
    };
    winner: PlayerRole | "tie";
    duration: number; // seconds
  };
}

export interface GamePausedMessage extends GameMessage {
  type: "game-paused";
  payload: Record<string, never>;
}

export interface GameResumedMessage extends GameMessage {
  type: "game-resumed";
  payload: Record<string, never>;
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
  | FlipCardMessage
  | CheckMatchMessage
  | EndTurnMessage
  | PauseGameMessage
  | ResumeGameMessage
  | EndGameMessage;

// Union type for all server messages
export type ServerGameMessage =
  | GameStateMessage
  | CardFlippedMessage
  | MatchResultMessage
  | TurnChangedMessage
  | GameCompletedMessage
  | GamePausedMessage
  | GameResumedMessage
  | GameErrorMessage;
