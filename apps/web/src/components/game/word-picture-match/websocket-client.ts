/**
 * WebSocket client for Word-Picture Match game
 */

import type {
  GameState,
  PlayerRole,
  ClientGameMessage,
  ServerGameMessage,
} from "@empat-challenge/domain/types";

interface WebSocketConfig {
  sessionId: string;
  token: string | null;
  role: PlayerRole;
}

export class GameWebSocketClient {
  private ws: WebSocket | null = null;
  private gameState: GameState | null = null;
  private config: WebSocketConfig;
  private messageHandlers: Map<string, Array<(message: ServerGameMessage) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isUserDisconnect = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(sessionId: string, token: string | null, role: PlayerRole) {
    this.config = { sessionId, token, role };
  }

  async connect(): Promise<void> {
    // Prevent multiple simultaneous connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private _connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = this.buildWebSocketUrl();
        if (!url) {
          reject(new Error("Failed to build WebSocket URL"));
          return;
        }

        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            this.ws.close();
            reject(new Error("Connection timeout"));
          }
        }, 10000);

        let isResolved = false;
        let isRejected = false;

        console.log("[GameWebSocket] Creating WebSocket connection to:", url);
        this.ws = new WebSocket(url);
        console.log("[GameWebSocket] WebSocket created, readyState:", this.ws.readyState);
        this.setupEventHandlers(resolve, reject, timeout);
      } catch (error) {
        reject(error);
      }
    });
  }

  private buildWebSocketUrl(): string | null {
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    if (!serverUrl) {
      console.error("[GameWebSocket] VITE_SERVER_URL is not set");
      return null;
    }

    try {
      const serverUrlObj = new URL(serverUrl);
      const protocol = serverUrlObj.protocol === "https:" ? "wss:" : "ws:";
      const host = serverUrlObj.host;

      if (!this.config.sessionId) {
        console.error("[GameWebSocket] Session ID is required");
        return null;
      }

      // Build query params
      const params = new URLSearchParams();
      params.set("role", this.config.role);

      // Only add token for students (SLP uses cookies)
      if (this.config.role === "student") {
        if (!this.config.token) {
          console.error("[GameWebSocket] Token is required for student role");
          return null;
        }
        params.set("token", this.config.token);
      }

      return `${protocol}//${host}/ws/game/${this.config.sessionId}?${params.toString()}`;
    } catch (error) {
      console.error("[GameWebSocket] Invalid server URL:", error);
      return null;
    }
  }

  private setupEventHandlers(
    resolve: () => void,
    reject: (error: Error) => void,
    timeout: NodeJS.Timeout,
  ): void {
    if (!this.ws) return;

    let isResolved = false;
    let isRejected = false;

    this.ws.onopen = () => {
      console.log("[GameWebSocket] WebSocket opened successfully");
      clearTimeout(timeout);
      this.reconnectAttempts = 0;
      this.isUserDisconnect = false;
      isResolved = true;

      // Send join-game message immediately
      console.log("[GameWebSocket] Sending join-game message");
      this.send({
        type: "join-game",
        payload: {
          therapySessionId: this.config.sessionId,
          role: this.config.role,
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

    this.ws.onerror = () => {
      console.error("=========== [GameWebSocket] WebSocket error");
      clearTimeout(timeout);
      // if (!isRejected && !isResolved) {
      //   isRejected = true;
      //   reject(new Error("WebSocket connection error"));
      // }
    };

    this.ws.onclose = (event) => {
      clearTimeout(timeout);
      console.log("[GameWebSocket] WebSocket closed", {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
        isResolved,
        isRejected,
        isUserDisconnect: this.isUserDisconnect,
      });
      this.ws = null;

      // Handle initial connection failure
      if (!isResolved && !isRejected) {
        isRejected = true;
        const errorMessage = this.getErrorMessage(event);
        console.error("[GameWebSocket] Connection failed before open:", errorMessage);
        reject(new Error(errorMessage));
        return;
      }

      // Auto-reconnect if not user-initiated and was previously connected
      if (
        !this.isUserDisconnect &&
        event.code !== 1000 &&
        isResolved &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(
          `[GameWebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`,
        );
        setTimeout(() => {
          this._connect().catch(console.error);
        }, delay);
      }
    };
  }

  private getErrorMessage(event: CloseEvent): string {
    if (event.code === 1006) {
      return "Connection closed abnormally. Check that the server is running.";
    }
    if (event.code === 1008) {
      return `Connection rejected: ${event.reason || "Invalid request"}`;
    }
    if (event.code === 1011) {
      return `Server error: ${event.reason || "Internal server error"}`;
    }
    return event.reason || `Connection closed with code ${event.code}`;
  }

  disconnect(): void {
    this.isUserDisconnect = true;
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
    if (message.type === "game-state") {
      this.gameState = message.payload as GameState;
    }

    // Call type-specific handlers
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

    // Call "all" handlers
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
