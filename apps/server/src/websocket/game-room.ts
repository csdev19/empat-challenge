import type {
  GameState,
  CardState,
  Match,
  PlayerRole,
  GameStatus,
} from "@empat-challenge/domain/types";
import { createDatabaseClient } from "@empat-challenge/db/client";
import { gameOutputTable, therapySessionTable, trialDataTable } from "@empat-challenge/db/schemas";
import { eq, and, isNull } from "drizzle-orm";
import { getEnv } from "../utils/env";

const env = getEnv();

interface Player {
  id: string;
  role: PlayerRole;
  ws: WebSocket;
}

interface GameCardSet {
  id: string;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  cards: Array<{
    id: string;
    type: "word" | "picture";
    content: string;
    matchId: string;
    imageUrl?: string;
  }>;
}

export class GameRoom {
  private gameState: GameState | null = null;
  private players: Map<PlayerRole, Player> = new Map();
  private therapySessionId: string;
  private gameOutputId: string | null = null;
  private attemptCounter = 0;
  private db = createDatabaseClient(env.DATABASE_URL);

  constructor(therapySessionId: string) {
    this.therapySessionId = therapySessionId;
  }

  addPlayer(player: Player): void {
    // Remove existing player with same role if any
    const existing = this.players.get(player.role);
    if (existing) {
      try {
        existing.ws.close();
      } catch {
        // Ignore errors
      }
    }

    this.players.set(player.role, player);

    // Setup WebSocket handlers
    player.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        this.handleMessage(message, player.role);
      } catch (error) {
        console.error("[GameRoom] Error parsing message:", error);
        this.sendError(player.ws, "Invalid message format");
      }
    };

    player.ws.onclose = () => {
      this.players.delete(player.role);
      console.log(`[GameRoom] Player ${player.role} disconnected`);
    };

    player.ws.onerror = (error) => {
      console.error(`[GameRoom] WebSocket error for ${player.role}:`, error);
    };

    // Send current game state if game is in progress
    if (this.gameState) {
      this.sendGameState(player.ws);
    }
  }

  removePlayer(role: PlayerRole): void {
    this.players.delete(role);
  }

  async initializeGame(cardSet: GameCardSet, firstPlayer: PlayerRole = "slp"): Promise<void> {
    // Create card states from card set
    const cards: CardState[] = cardSet.cards.map((card, index) => ({
      id: card.id,
      type: card.type,
      content: card.content,
      matchId: card.matchId,
      imageUrl: card.imageUrl,
      flipped: false,
      matched: false,
      position: index,
    }));

    // Shuffle positions
    this.shuffleArray(cards);

    // Initialize game state
    this.gameState = {
      gameId: crypto.randomUUID(),
      therapySessionId: this.therapySessionId,
      gameType: "word-picture-match",
      status: "waiting",
      currentPlayer: firstPlayer,
      turnsPlayed: 0,
      cardSetId: cardSet.id,
      cards,
      flippedCards: [],
      matches: [],
      score: {
        slp: { matches: 0, attempts: 0, accuracy: 0 },
        student: { matches: 0, attempts: 0, accuracy: 0 },
      },
      startedAt: null,
      completedAt: null,
      lastActivityAt: new Date().toISOString(),
      metadata: {
        difficulty: cardSet.difficulty,
        cardSetName: cardSet.name,
      },
    };

    // Create game output record
    try {
      const [gameOutput] = await this.db
        .insert(gameOutputTable)
        .values({
          id: this.gameState.gameId,
          therapySessionId: this.therapySessionId,
          gameType: "word-picture-match",
          gameState: this.gameState as unknown as Record<string, unknown>,
          startedAt: new Date(),
        })
        .returning();

      this.gameOutputId = gameOutput.id;
    } catch (error) {
      console.error("[GameRoom] Failed to create game output:", error);
    }

    // Start game if both players are connected
    if (this.players.has("slp") && this.players.has("student")) {
      await this.startGame();
    }
  }

  async startGame(): Promise<void> {
    if (!this.gameState) return;

    this.gameState.status = "playing";
    this.gameState.startedAt = new Date().toISOString();
    this.gameState.lastActivityAt = new Date().toISOString();

    this.broadcast({
      type: "game-state",
      payload: this.gameState,
      timestamp: new Date().toISOString(),
    });

    this.broadcast({
      type: "turn-changed",
      payload: {
        currentPlayer: this.gameState.currentPlayer,
        reason: "game-start",
      },
      timestamp: new Date().toISOString(),
    });
  }

  private async handleMessage(message: unknown, playerRole: PlayerRole): Promise<void> {
    if (!this.gameState) {
      this.sendError(this.players.get(playerRole)?.ws, "Game not initialized");
      return;
    }

    const msg = message as { type: string; payload: unknown };

    switch (msg.type) {
      case "flip-card":
        await this.handleFlipCard(msg.payload as { cardId: string }, playerRole);
        break;
      case "check-match":
        await this.handleCheckMatch(
          msg.payload as { card1Id: string; card2Id: string },
          playerRole,
        );
        break;
      case "end-turn":
        await this.handleEndTurn(playerRole);
        break;
      case "pause-game":
        if (playerRole === "slp") {
          await this.handlePauseGame();
        }
        break;
      case "resume-game":
        if (playerRole === "slp") {
          await this.handleResumeGame();
        }
        break;
      case "end-game":
        if (playerRole === "slp") {
          await this.handleEndGame();
        }
        break;
      default:
        this.sendError(this.players.get(playerRole)?.ws, `Unknown message type: ${msg.type}`);
    }
  }

  private async handleFlipCard(payload: { cardId: string }, playerRole: PlayerRole): Promise<void> {
    if (!this.gameState) return;

    // Validate it's player's turn
    if (this.gameState.currentPlayer !== playerRole) {
      this.sendError(
        this.players.get(playerRole)?.ws,
        "Not your turn",
      );
      return;
    }

    // Validate card exists and not already matched
    const card = this.gameState.cards.find((c) => c.id === payload.cardId);
    if (!card) {
      this.sendError(this.players.get(playerRole)?.ws, "Card not found");
      return;
    }

    if (card.matched) {
      this.sendError(this.players.get(playerRole)?.ws, "Card already matched");
      return;
    }

    if (card.flipped) {
      this.sendError(this.players.get(playerRole)?.ws, "Card already flipped");
      return;
    }

    // Validate max 2 cards flipped
    if (this.gameState.flippedCards.length >= 2) {
      this.sendError(this.players.get(playerRole)?.ws, "Maximum 2 cards can be flipped");
      return;
    }

    // Flip card
    card.flipped = true;
    this.gameState.flippedCards.push(card.id);
    this.gameState.lastActivityAt = new Date().toISOString();

    // Broadcast card flipped
    this.broadcast({
      type: "card-flipped",
      payload: {
        cardId: card.id,
        player: playerRole,
      },
      timestamp: new Date().toISOString(),
    });

    // Send updated game state
    this.broadcast({
      type: "game-state",
      payload: this.gameState,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleCheckMatch(
    payload: { card1Id: string; card2Id: string },
    playerRole: PlayerRole,
  ): Promise<void> {
    if (!this.gameState) return;

    // Validate it's player's turn
    if (this.gameState.currentPlayer !== playerRole) {
      this.sendError(this.players.get(playerRole)?.ws, "Not your turn");
      return;
    }

    // Validate both cards are flipped
    const card1 = this.gameState.cards.find((c) => c.id === payload.card1Id);
    const card2 = this.gameState.cards.find((c) => c.id === payload.card2Id);

    if (!card1 || !card2) {
      this.sendError(this.players.get(playerRole)?.ws, "One or both cards not found");
      return;
    }

    if (!card1.flipped || !card2.flipped) {
      this.sendError(this.players.get(playerRole)?.ws, "Both cards must be flipped");
      return;
    }

    if (card1.matched || card2.matched) {
      this.sendError(this.players.get(playerRole)?.ws, "One or both cards already matched");
      return;
    }

    // Check if cards match
    const isMatch = card1.matchId === card2.id || card2.matchId === card1.id;
    this.attemptCounter++;

    // Update scores
    const playerScore = this.gameState.score[playerRole];
    playerScore.attempts++;
    if (isMatch) {
      playerScore.matches++;
    }
    playerScore.accuracy = playerScore.attempts > 0
      ? (playerScore.matches / playerScore.attempts) * 100
      : 0;

    // Create match record
    const match: Match = {
      card1Id: card1.id,
      card2Id: card2.id,
      player: playerRole,
      correct: isMatch,
      timestamp: new Date().toISOString(),
      attemptNumber: this.attemptCounter,
    };

    this.gameState.matches.push(match);

    // Record trial in database
    try {
      await this.db.insert(trialDataTable).values({
        id: crypto.randomUUID(),
        therapySessionId: this.therapySessionId,
        trialNumber: this.attemptCounter,
        isCorrect: isMatch,
        notes: `Game match attempt: ${card1.content} + ${card2.content}`,
      });
    } catch (error) {
      console.error("[GameRoom] Failed to record trial:", error);
    }

    if (isMatch) {
      // Mark cards as matched
      card1.matched = true;
      card2.matched = true;
      this.gameState.flippedCards = [];
      this.gameState.turnsPlayed++;

      // Check if game is complete
      const allMatched = this.gameState.cards.every((c) => c.matched);
      if (allMatched) {
        await this.completeGame();
        return;
      }
    } else {
      // Cards don't match - flip them back and switch turns
      card1.flipped = false;
      card2.flipped = false;
      this.gameState.flippedCards = [];
      this.gameState.currentPlayer = playerRole === "slp" ? "student" : "slp";
      this.gameState.turnsPlayed++;
    }

    this.gameState.lastActivityAt = new Date().toISOString();

    // Broadcast match result
    this.broadcast({
      type: "match-result",
      payload: {
        card1Id: card1.id,
        card2Id: card2.id,
        correct: isMatch,
        player: playerRole,
        newScore: this.gameState.score,
      },
      timestamp: new Date().toISOString(),
    });

    // Send updated game state
    this.broadcast({
      type: "game-state",
      payload: this.gameState,
      timestamp: new Date().toISOString(),
    });

    // If incorrect match, switch turns
    if (!isMatch) {
      this.broadcast({
        type: "turn-changed",
        payload: {
          currentPlayer: this.gameState.currentPlayer,
          reason: "incorrect-match",
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private async handleEndTurn(playerRole: PlayerRole): Promise<void> {
    if (!this.gameState) return;

    if (this.gameState.currentPlayer !== playerRole) {
      this.sendError(this.players.get(playerRole)?.ws, "Not your turn");
      return;
    }

    // Flip back any flipped cards
    this.gameState.cards.forEach((card) => {
      if (card.flipped && !card.matched) {
        card.flipped = false;
      }
    });
    this.gameState.flippedCards = [];

    // Switch turns
    this.gameState.currentPlayer = playerRole === "slp" ? "student" : "slp";
    this.gameState.turnsPlayed++;
    this.gameState.lastActivityAt = new Date().toISOString();

    this.broadcast({
      type: "turn-changed",
      payload: {
        currentPlayer: this.gameState.currentPlayer,
        reason: "end-turn",
      },
      timestamp: new Date().toISOString(),
    });

    this.broadcast({
      type: "game-state",
      payload: this.gameState,
      timestamp: new Date().toISOString(),
    });
  }

  private async handlePauseGame(): Promise<void> {
    if (!this.gameState || this.gameState.status !== "playing") return;

    this.gameState.status = "paused";
    this.gameState.lastActivityAt = new Date().toISOString();

    this.broadcast({
      type: "game-paused",
      payload: {},
      timestamp: new Date().toISOString(),
    });

    this.broadcast({
      type: "game-state",
      payload: this.gameState,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleResumeGame(): Promise<void> {
    if (!this.gameState || this.gameState.status !== "paused") return;

    this.gameState.status = "playing";
    this.gameState.lastActivityAt = new Date().toISOString();

    this.broadcast({
      type: "game-resumed",
      payload: {},
      timestamp: new Date().toISOString(),
    });

    this.broadcast({
      type: "game-state",
      payload: this.gameState,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleEndGame(): Promise<void> {
    await this.completeGame();
  }

  private async completeGame(): Promise<void> {
    if (!this.gameState) return;

    this.gameState.status = "completed";
    this.gameState.completedAt = new Date().toISOString();
    this.gameState.lastActivityAt = new Date().toISOString();

    // Calculate duration
    const startedAt = this.gameState.startedAt
      ? new Date(this.gameState.startedAt).getTime()
      : Date.now();
    const completedAt = Date.now();
    const duration = Math.floor((completedAt - startedAt) / 1000);

    // Determine winner
    const slpScore = this.gameState.score.slp.matches;
    const studentScore = this.gameState.score.student.matches;
    let winner: PlayerRole | "tie" = "tie";
    if (slpScore > studentScore) {
      winner = "slp";
    } else if (studentScore > slpScore) {
      winner = "student";
    }

    // Update game output in database
    if (this.gameOutputId) {
      try {
        const slpAccuracy = this.gameState.score.slp.accuracy;
        const studentAccuracy = this.gameState.score.student.accuracy;
        const overallAccuracy = (slpAccuracy + studentAccuracy) / 2;

        await this.db
          .update(gameOutputTable)
          .set({
            gameState: this.gameState as unknown as Record<string, unknown>,
            score: slpScore + studentScore,
            accuracy: overallAccuracy.toString(),
            duration,
            turnsPlayed: this.gameState.turnsPlayed,
            playerResults: {
              slp: this.gameState.score.slp,
              student: this.gameState.score.student,
            },
            gameEvents: this.gameState.matches.map((m) => ({
              type: "match",
              player: m.player,
              timestamp: m.timestamp,
              data: {
                card1Id: m.card1Id,
                card2Id: m.card2Id,
                correct: m.correct,
              },
            })),
            completedAt: new Date(),
          })
          .where(eq(gameOutputTable.id, this.gameOutputId));
      } catch (error) {
        console.error("[GameRoom] Failed to update game output:", error);
      }
    }

    // Broadcast game completed
    this.broadcast({
      type: "game-completed",
      payload: {
        finalScore: this.gameState.score,
        winner,
        duration,
      },
      timestamp: new Date().toISOString(),
    });

    this.broadcast({
      type: "game-state",
      payload: this.gameState,
      timestamp: new Date().toISOString(),
    });
  }

  private broadcast(message: { type: string; payload: unknown; timestamp: string }): void {
    const json = JSON.stringify(message);
    this.players.forEach((player) => {
      if (player.ws.readyState === WebSocket.OPEN) {
        try {
          player.ws.send(json);
        } catch (error) {
          console.error(`[GameRoom] Failed to send message to ${player.role}:`, error);
        }
      }
    });
  }

  private sendError(ws: WebSocket | undefined, message: string, code?: string): void {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message, code },
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.error("[GameRoom] Failed to send error:", error);
    }
  }

  private sendGameState(ws: WebSocket): void {
    if (!this.gameState || ws.readyState !== WebSocket.OPEN) return;

    try {
      ws.send(
        JSON.stringify({
          type: "game-state",
          payload: this.gameState,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.error("[GameRoom] Failed to send game state:", error);
    }
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  hasPlayer(role: PlayerRole): boolean {
    return this.players.has(role);
  }

  getPlayerCount(): number {
    return this.players.size;
  }
}
