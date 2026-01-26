/**
 * Main game scene for Word-Picture Match
 */

import type { GameState, PlayerRole } from "@empat-challenge/domain/types";
import { GridManager } from "./grid-manager";
import { CardSprite } from "./card-sprite";
import { GameWebSocketClient } from "./websocket-client";

// Get Phaser from global scope (set by game-container before importing this module)
const getPhaser = () => {
  if (typeof window === "undefined") {
    throw new Error("Phaser must be available globally");
  }
  const Phaser = (window as any).Phaser;
  if (!Phaser) {
    throw new Error("Phaser must be available globally before importing GameScene");
  }
  return Phaser;
};

// Create scene class dynamically using Phaser
export function createGameScene() {
  const Phaser = getPhaser();
  
  class GameScene extends Phaser.Scene {
    private gridManager: GridManager | null = null;
    private cards: CardSprite[] = [];
    private gameState: GameState | null = null;
    private wsClient: GameWebSocketClient | null = null;
    private scoreText: any = null;
    private turnText: any = null;
    private currentPlayer: PlayerRole | null = null;
    private flippedCards: CardSprite[] = [];

    constructor() {
      super({ key: "GameScene" });
    }

    init(data: { wsClient: GameWebSocketClient; role: PlayerRole }): void {
      this.wsClient = data.wsClient;
      this.currentPlayer = data.role;

      // Set up WebSocket message handlers
      if (this.wsClient) {
        this.wsClient.onMessage("game-state", (message) => {
          const state = message.payload as GameState;
          this.updateGameState(state);
        });

        this.wsClient.onMessage("card-flipped", () => {
          // Card flip animation handled by updateGameState
        });

        this.wsClient.onMessage("match-result", (message) => {
          const payload = message.payload as {
            card1Id: string;
            card2Id: string;
            correct: boolean;
            player: PlayerRole;
          };

          const card1 = this.cards.find((c) => c.cardId === payload.card1Id);
          const card2 = this.cards.find((c) => c.cardId === payload.card2Id);

          if (card1 && card2) {
            if (payload.correct) {
              card1.setMatched();
              card2.setMatched();
            } else {
              card1.showMismatch();
              card2.showMismatch();
              // Cards will flip back via game-state update
            }
          }
        });

        this.wsClient.onMessage("turn-changed", (message) => {
          const payload = message.payload as { currentPlayer: PlayerRole };
          this.currentPlayer = payload.currentPlayer;
          this.updateTurnIndicator();
        });

        this.wsClient.onMessage("error", (message) => {
          const payload = message.payload as { message: string };
          console.error("[GameScene] Error:", payload.message);
          // Could show error toast here
        });
      }
    }

    create(): void {
      const { width, height } = this.cameras.main;

      // Create UI elements
      this.createUI(width, height);

      // Initialize grid manager
      const gameState = this.wsClient?.getGameState();
      if (gameState) {
        this.setupGame(gameState, width, height);
      }
    }

    private createUI(width: number, height: number): void {
      // Score display
      this.scoreText = this.add.text(width / 2, 30, "Score: SLP 0 - Student 0", {
        fontSize: "20px",
        color: "#000000",
      });
      this.scoreText.setOrigin(0.5);

      // Turn indicator
      this.turnText = this.add.text(width / 2, 60, "Waiting for game to start...", {
        fontSize: "18px",
        color: "#666666",
      });
      this.turnText.setOrigin(0.5);
    }

    private setupGame(gameState: GameState, width: number, height: number): void {
      this.gameState = gameState;

      // Create grid manager
      const gameAreaHeight = height - 120; // Leave space for UI
      this.gridManager = new GridManager(this, width - 40, gameAreaHeight, gameState.cards.length);

      // Create cards
      this.cards = this.gridManager.createCards(this, gameState.cards);

      // Make cards clickable
      this.cards.forEach((card) => {
        card.on("pointerdown", () => {
          this.handleCardClick(card);
        });
      });

      // Update UI
      this.updateScore();
      this.updateTurnIndicator();
      this.updateCardsFromState();
    }

    private handleCardClick(card: CardSprite): void {
      if (!this.gameState || !this.wsClient) return;

      // Check if it's player's turn
      if (this.gameState.currentPlayer !== this.currentPlayer) {
        return;
      }

      // Check if card can be flipped
      if (card.isFlipped || card.isMatched) {
        return;
      }

      // Check if max cards flipped
      if (this.gameState.flippedCards.length >= 2) {
        return;
      }

      // Send flip-card message
      this.wsClient.send({
        type: "flip-card",
        payload: { cardId: card.cardId },
        timestamp: new Date().toISOString(),
        player: this.currentPlayer!,
      });

      // Optimistically flip card
      card.flip();
      this.flippedCards.push(card);

      // If 2 cards are flipped, automatically check match
      if (this.flippedCards.length === 2) {
        setTimeout(() => {
          if (this.flippedCards.length === 2) {
            this.checkMatch();
          }
        }, 1000); // Wait 1 second before checking match
      }
    }

    private checkMatch(): void {
      if (!this.wsClient || this.flippedCards.length !== 2) return;

      const card1 = this.flippedCards[0];
      const card2 = this.flippedCards[1];

      this.wsClient.send({
        type: "check-match",
        payload: {
          card1Id: card1.cardId,
          card2Id: card2.cardId,
        },
        timestamp: new Date().toISOString(),
        player: this.currentPlayer!,
      });

      this.flippedCards = [];
    }

    private updateGameState(gameState: GameState): void {
      this.gameState = gameState;

      if (!this.gridManager) {
        // Game not set up yet, set it up now
        const { width, height } = this.cameras.main;
        this.setupGame(gameState, width, height);
        return;
      }

      // Update cards from state
      this.updateCardsFromState();
      this.updateScore();
      this.updateTurnIndicator();
    }

    private updateCardsFromState(): void {
      if (!this.gameState || !this.gridManager) return;

      this.gridManager.updateCards(this.gameState.cards);

      // Reset flipped cards array based on current state
      this.flippedCards = [];
      this.gameState.flippedCards.forEach((cardId) => {
        const card = this.cards.find((c) => c.cardId === cardId);
        if (card && !card.isFlipped) {
          card.flip();
          this.flippedCards.push(card);
        }
      });
    }

    private updateScore(): void {
      if (!this.scoreText || !this.gameState) return;

      const slpScore = this.gameState.score.slp.matches;
      const studentScore = this.gameState.score.student.matches;

      this.scoreText.setText(`Score: SLP ${slpScore} - Student ${studentScore}`);
    }

    private updateTurnIndicator(): void {
      if (!this.turnText || !this.gameState) return;

      if (this.gameState.status === "waiting") {
        this.turnText.setText("Waiting for game to start...");
        this.turnText.setColor("#666666");
      } else if (this.gameState.status === "paused") {
        this.turnText.setText("Game Paused");
        this.turnText.setColor("#ff9900");
      } else if (this.gameState.status === "completed") {
        this.turnText.setText("Game Completed!");
        this.turnText.setColor("#00aa00");
      } else {
        const isMyTurn = this.gameState.currentPlayer === this.currentPlayer;
        const playerName = this.gameState.currentPlayer === "slp" ? "SLP" : "Student";
        this.turnText.setText(isMyTurn ? `Your turn (${playerName})` : `${playerName}'s turn`);
        this.turnText.setColor(isMyTurn ? "#00aa00" : "#666666");
      }
    }
  }

  return GameScene;
}

// Export a getter that creates the scene class
export const GameScene = createGameScene();
