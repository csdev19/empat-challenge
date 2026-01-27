/**
 * Local types for Word-Picture Choice game component
 */

import type {
  GameState,
  PlayerRole,
  Prompt,
  Option,
  ClientGameMessage,
  ServerGameMessage,
} from "@empat-challenge/domain/types";

export type { GameState, PlayerRole, Prompt, Option };

export interface GameProps {
  sessionId: string;
  token: string;
  role: PlayerRole;
}

export type { ClientGameMessage, ServerGameMessage };
