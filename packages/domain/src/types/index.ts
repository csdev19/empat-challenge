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
export type { GameStatus, PlayerRole, Option, Prompt, GameState } from "./game-state";

export type {
  GameMessage,
  JoinGameMessage,
  SelectOptionMessage,
  NextPromptMessage,
  EndGameMessage,
  GameStateMessage,
  AnswerResultMessage,
  NewPromptMessage,
  GameCompletedMessage,
  GameErrorMessage,
  ClientGameMessage,
  ServerGameMessage,
} from "./game-messages";
