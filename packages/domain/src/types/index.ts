/**
 * Utility type to extract object property values
 * Useful for creating type-safe constants
 */
export type ObjectProperties<T> = T[keyof T];

// Export Result types
export type { Success, Failure, Result } from "./result";

export { tryCatch, isSuccess, isFailure, unwrap } from "./result";

// Export API Response types
export type {
  ApiResponse,
  PaginationMeta,
  PaginationParams,
  PaginationResult,
} from "./api-response";

// Export Game types
export type {
  GameStatus,
  PlayerRole,
  CardType,
  CardState,
  Match,
  PlayerScore,
  GameState,
} from "./game-state";

export type {
  GameMessage,
  JoinGameMessage,
  FlipCardMessage,
  CheckMatchMessage,
  EndTurnMessage,
  PauseGameMessage,
  ResumeGameMessage,
  EndGameMessage,
  GameStateMessage,
  CardFlippedMessage,
  MatchResultMessage,
  TurnChangedMessage,
  GameCompletedMessage,
  GamePausedMessage,
  GameResumedMessage,
  GameErrorMessage,
  ClientGameMessage,
  ServerGameMessage,
} from "./game-messages";
