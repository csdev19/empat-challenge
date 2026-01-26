/**
 * WebSocket client for Word-Picture Match game
 */

import type {
  GameState,
  PlayerRole,
  ClientGameMessage,
  ServerGameMessage,
} from "@empat-challenge/domain/types";

export class GameWebSocketClient {
  private ws: WebSocket | null = null;
  private gameState: GameState | null = null;
  private sessionId: string;
  private token: string;
  private role: PlayerRole;
  private messageHandlers: Map<string, Array<(message: ServerGameMessage) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(sessionId: string, token: string, role: PlayerRole) {
    this.sessionId = sessionId;
    this.token = token;
    this.role = role;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        // Get API URL from env or use current host
        const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || window.location.origin;
        const host = apiUrl.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "");
        // For SLP, token can be "cookie" (server validates via cookies)
        // For student, token is the linkToken
        const tokenParam = this.role === "slp" ? "cookie" : encodeURIComponent(this.token);
        const url = `${protocol}//${host}/ws/game/${this.sessionId}?token=${tokenParam}&role=${this.role}`;

        console.log("[GameWebSocket] Connecting to:", url.replace(/token=[^&]+/, "token=***"));

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log("[GameWebSocket] Connected");
          this.reconnectAttempts = 0;

          // Send join-game message
          this.send({
            type: "join-game",
            payload: {
              therapySessionId: this.sessionId,
              role: this.role,
            },
            timestamp: new Date().toISOString(),
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string) as ServerGameMessage;
            this.handleMessage(message);
          } catch (error) {
            console.error("[GameWebSocket] Error parsing message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("[GameWebSocket] Error:", error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log("[GameWebSocket] Closed:", event.code, event.reason);
          this.ws = null;

          // Attempt to reconnect if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[GameWebSocket] Reconnecting (attempt ${this.reconnectAttempts})...`);
            setTimeout(() => {
              this.connect().catch(console.error);
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  send(message: ClientGameMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[GameWebSocket] Cannot send message, WebSocket not open");
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("[GameWebSocket] Error sending message:", error);
    }
  }

  onMessage(type: string, handler: (message: ServerGameMessage) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  private handleMessage(message: ServerGameMessage): void {
    // Update game state if received
    if (message.type === "game-state") {
      this.gameState = message.payload as GameState;
    }

    // Call all handlers for this message type
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`[GameWebSocket] Error in handler for ${message.type}:`, error);
        }
      });
    }

    // Also call "all" handlers
    const allHandlers = this.messageHandlers.get("all");
    if (allHandlers) {
      allHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error("[GameWebSocket] Error in 'all' handler:", error);
        }
      });
    }
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
