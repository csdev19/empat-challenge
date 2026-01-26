/**
 * Local types for Word-Picture Match game component
 */

import type {
  GameState,
  CardState,
  PlayerRole,
  ClientGameMessage,
  ServerGameMessage,
} from "@empat-challenge/domain/types";

export type { GameState, CardState, PlayerRole };

export interface GameProps {
  sessionId: string;
  token: string;
  role: PlayerRole;
}

export interface GameCardData {
  id: string;
  type: "word" | "picture";
  content: string;
  matchId: string;
  imageUrl?: string;
}

export interface GameCardSet {
  id: string;
  name: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
  cardCount: number;
  cards: GameCardData[];
}

export interface GameCardsData {
  cardSets: GameCardSet[];
}

export type { ClientGameMessage, ServerGameMessage };
