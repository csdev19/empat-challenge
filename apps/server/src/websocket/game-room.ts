import type {
  GameState,
  PlayerRole,
} from "@empat-challenge/domain/types";
import { createDatabaseClient } from "@empat-challenge/db/client";
import { gameOutputTable, trialDataTable } from "@empat-challenge/db/schemas";
import { eq } from "drizzle-orm";
import { getEnv } from "../utils/env";
import {
  type PromptSet,
  loadPromptSet,
  shufflePromptOptions,
} from "../utils/prompt-loader";

const env = getEnv();

interface Player {
  id: string;
  role: PlayerRole;
  ws: any; // Elysia WebSocket type
}

export class GameRoom {
  private gameState: GameState | null = null;
  private players: Map<PlayerRole, Player> = new Map();
  private therapySessionId: string;
  private gameOutputId: string | null = null;
  private db = createDatabaseClient(env.DATABASE_URL);
  private promptSet: PromptSet | null = null;
  private currentPromptIndex = 0;
  private promptHistory: string[] = []; // Track shown prompt IDs

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
    player.ws.onmessage = (event: any) => {
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

    player.ws.onerror = (error: any) => {
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

  async initializeGame(promptSetId: string): Promise<void> {
    // Load prompt set
    this.promptSet = loadPromptSet(promptSetId);
    this.currentPromptIndex = 0;

    // Validate prompt set has prompts
    if (!this.promptSet.prompts || this.promptSet.prompts.length === 0) {
      throw new Error("Prompt set has no prompts");
    }

    // Get first prompt
    const firstPromptData = this.promptSet.prompts[0];
    if (!firstPromptData) {
      throw new Error("First prompt not found");
    }

    // Shuffle options for variety
    const firstPrompt = shufflePromptOptions(firstPromptData);

    // Initialize game state
    this.gameState = {
      gameId: crypto.randomUUID(),
      therapySessionId: this.therapySessionId,
      gameType: "word-picture-choice",
      status: "waiting",
      currentPrompt: firstPrompt,
      turn: "student",
      attempts: 0,
      correctAttempts: 0,
      startedAt: null,
      completedAt: null,
      lastActivityAt: new Date().toISOString(),
      metadata: {
        difficulty: this.promptSet.difficulty,
        promptSetName: this.promptSet.name,
        promptSetId: this.promptSet.id,
        totalPrompts: this.promptSet.prompts.length,
        currentPromptIndex: 0,
      },
    };

    this.promptHistory.push(firstPrompt.id);

    // Create game output record
    try {
      const [gameOutput] = await this.db
        .insert(gameOutputTable)
        .values({
          id: this.gameState.gameId,
          therapySessionId: this.therapySessionId,
          gameType: "word-picture-choice",
          gameState: this.gameState as unknown as Record<string, unknown>,
          startedAt: new Date(),
        })
        .returning();

      if (gameOutput) {
        this.gameOutputId = gameOutput.id;
      }
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

    this.gameState.status = "active";
    this.gameState.startedAt = new Date().toISOString();
    this.gameState.lastActivityAt = new Date().toISOString();

    this.broadcast({
      type: "game-state",
      payload: this.gameState,
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
      case "select-option":
        await this.handleSelectOption(msg.payload as { optionId: string }, playerRole);
        break;
      case "next-prompt":
        await this.handleNextPrompt(playerRole);
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

  private async handleSelectOption(
    payload: { optionId: string },
    playerRole: PlayerRole
  ): Promise<void> {
    if (!this.gameState) return;

    // Only student can select options
    if (playerRole !== "student") {
      this.sendError(
        this.players.get(playerRole)?.ws,
        "Only student can select options"
      );
      return;
    }

    // Check if game is active
    if (this.gameState.status !== "active") {
      this.sendError(
        this.players.get(playerRole)?.ws,
        "Game is not active"
      );
      return;
    }

    // Find selected option
    const selectedOption = this.gameState.currentPrompt.options.find(
      (opt) => opt.id === payload.optionId
    );

    if (!selectedOption) {
      this.sendError(this.players.get(playerRole)?.ws, "Option not found");
      return;
    }

    // Update attempts and correct attempts
    this.gameState.attempts++;
    if (selectedOption.isCorrect) {
      this.gameState.correctAttempts++;
    }

    // Update last answer
    this.gameState.lastAnswer = {
      optionId: payload.optionId,
      correct: selectedOption.isCorrect,
      timestamp: new Date().toISOString(),
    };

    this.gameState.lastActivityAt = new Date().toISOString();

    // Record trial in database
    try {
      await this.db.insert(trialDataTable).values({
        id: crypto.randomUUID(),
        therapySessionId: this.therapySessionId,
        trialNumber: this.gameState.attempts,
        isCorrect: selectedOption.isCorrect,
        notes: `Prompt: ${this.gameState.currentPrompt.word}, Selected: ${payload.optionId}`,
      });
    } catch (error) {
      console.error("[GameRoom] Failed to record trial:", error);
    }

    // Broadcast answer result
    this.broadcast({
      type: "answer-result",
      payload: {
        optionId: payload.optionId,
        correct: selectedOption.isCorrect,
        attempts: this.gameState.attempts,
        correctAttempts: this.gameState.correctAttempts,
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

  private async handleNextPrompt(playerRole: PlayerRole): Promise<void> {
    if (!this.gameState || !this.promptSet) return;

    // Only SLP can advance to next prompt
    if (playerRole !== "slp") {
      this.sendError(
        this.players.get(playerRole)?.ws,
        "Only SLP can advance to next prompt"
      );
      return;
    }

    // Check if game is active
    if (this.gameState.status !== "active") {
      this.sendError(
        this.players.get(playerRole)?.ws,
        "Game is not active"
      );
      return;
    }

    // Move to next prompt
    this.currentPromptIndex++;

    // Check if all prompts completed
    if (this.currentPromptIndex >= this.promptSet.prompts.length) {
      await this.completeGame();
      return;
    }

    // Get next prompt
    const nextPromptData = this.promptSet.prompts[this.currentPromptIndex];
    if (!nextPromptData) {
      await this.completeGame();
      return;
    }

    // Shuffle options for variety
    const nextPrompt = shufflePromptOptions(nextPromptData);

    // Update game state
    this.gameState.currentPrompt = nextPrompt;
    this.gameState.lastActivityAt = new Date().toISOString();
    
    if (this.gameState.metadata) {
      this.gameState.metadata.currentPromptIndex = this.currentPromptIndex;
    }

    this.promptHistory.push(nextPrompt.id);

    // Broadcast new prompt
    this.broadcast({
      type: "new-prompt",
      payload: {
        prompt: nextPrompt,
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

    // Calculate accuracy
    const accuracy = this.gameState.attempts > 0
      ? (this.gameState.correctAttempts / this.gameState.attempts) * 100
      : 0;

    // Update game output in database
    if (this.gameOutputId) {
      try {
        await this.db
          .update(gameOutputTable)
          .set({
            gameState: this.gameState as unknown as Record<string, unknown>,
            score: this.gameState.correctAttempts,
            accuracy: accuracy.toString(),
            duration,
            turnsPlayed: this.gameState.attempts,
            playerResults: {
              student: {
                attempts: this.gameState.attempts,
                correctAttempts: this.gameState.correctAttempts,
                accuracy,
              },
            },
            gameEvents: [],
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
        attempts: this.gameState.attempts,
        correctAttempts: this.gameState.correctAttempts,
        accuracy,
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
      // Check readyState (1 = OPEN for WebSocket)
      if (player.ws.readyState === 1) {
        try {
          player.ws.send(json);
        } catch (error) {
          console.error(`[GameRoom] Failed to send message to ${player.role}:`, error);
        }
      }
    });
  }

  private sendError(ws: any, message: string, code?: string): void {
    if (!ws || ws.readyState !== 1) return; // 1 = OPEN

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

  private sendGameState(ws: any): void {
    if (!this.gameState || ws.readyState !== 1) return; // 1 = OPEN

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
