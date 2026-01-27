import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { createAuth } from "@empat-challenge/auth";
import { createDatabaseClient } from "@empat-challenge/db/client";
import { therapySessionTable } from "@empat-challenge/db/schemas";
import { eq, and, isNull } from "drizzle-orm";
import { getEnv } from "./utils/env";
import { GameRoom } from "./websocket/game-room";
import { getDefaultPromptSetId } from "./utils/prompt-loader";
import type { PlayerRole } from "@empat-challenge/domain/types";

const env = getEnv();
const auth = createAuth(env.CORS_ORIGIN);
const db = createDatabaseClient(env.DATABASE_URL);

// In-memory storage for game rooms
const gameRooms = new Map<string, GameRoom>();

// Create Express app
const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", env.CORS_ORIGIN);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[Express] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Create HTTP server
const server = createServer(app);

// Handle WebSocket upgrade requests
server.on("upgrade", (request, socket, head) => {
  const pathname = request.url
    ? new URL(request.url, `http://${request.headers.host}`).pathname
    : "";

  // Only handle /ws/game/* paths
  if (pathname.startsWith("/ws/game/")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      // The connection handler will be called with the upgraded WebSocket
      handleWebSocketConnection(ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Create WebSocket server - handle upgrade requests manually
const wss = new WebSocketServer({
  noServer: true, // Don't auto-upgrade, we'll handle it manually
});

// WebSocket connection handler
async function handleWebSocketConnection(ws: WebSocket, request: any) {
  try {
    console.log("[GameServer] WebSocket connection attempt");
    console.log("[GameServer] Request URL:", request.url);

    if (!request.url) {
      console.warn("[GameServer] Connection rejected: missing URL");
      ws.close(1008, "Missing URL");
      return;
    }

    // Parse URL to extract sessionId and query params
    // Handle both absolute and relative URLs
    const baseUrl = request.headers.host
      ? `http://${request.headers.host}`
      : `http://localhost:${port}`;
    const url = new URL(request.url, baseUrl);
    console.log("[GameServer] Parsed URL pathname:", url.pathname);

    // Extract sessionId from path (format: /ws/game/:sessionId)
    const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
    console.log("[GameServer] Path parts:", pathParts);

    // Find sessionId - it should be after "game"
    const gameIndex = pathParts.indexOf("game");
    const sessionId =
      gameIndex >= 0 && gameIndex < pathParts.length - 1
        ? pathParts[gameIndex + 1]
        : pathParts[pathParts.length - 1];

    console.log("[GameServer] Extracted sessionId:", sessionId);

    if (!sessionId) {
      console.warn("[GameServer] Connection rejected: missing sessionId");
      ws.close(1008, "Session ID required");
      return;
    }

    // Extract token and role from query params
    const token = url.searchParams.get("token");
    const roleParam = url.searchParams.get("role");

    console.log("[GameServer] Query params - role:", roleParam, "token:", token ? "***" : "none");

    if (!roleParam) {
      console.warn("[GameServer] Connection rejected: missing role");
      ws.close(1008, "Role required");
      return;
    }

    const role = roleParam as PlayerRole;
    if (role !== "slp" && role !== "student") {
      console.warn(`[GameServer] Connection rejected: invalid role ${roleParam}`);
      ws.close(1008, "Invalid role");
      return;
    }

    // ============================================
    // SIMPLIFIED VALIDATION (PUBLIC - NO SECURITY)
    // Bypassing all security checks for development
    // ============================================

    let userId: string;

    if (role === "student") {
      console.log("[GameServer] Student connection (public mode - no validation)");
      // Just verify session exists (optional check)
      const [session] = await db
        .select()
        .from(therapySessionTable)
        .where(and(eq(therapySessionTable.id, sessionId), isNull(therapySessionTable.deletedAt)))
        .limit(1);

      if (!session) {
        console.warn(`[GameServer] Session ${sessionId} not found, but allowing connection anyway`);
      }

      userId = `student-${sessionId}`;
      console.log("[GameServer] Student connected (public mode)");
    } else if (role === "slp") {
      console.log("[GameServer] SLP connection (public mode - no validation)");

      // Try to get user from auth session if available, but don't require it
      let slpUserId: string | null = null;
      try {
        // Convert Express request to fetch-like headers
        const headers = new Headers();
        Object.entries(request.headers).forEach(([key, value]) => {
          if (value) {
            headers.set(key, Array.isArray(value) ? value[0] : value);
          }
        });

        const authSession = await auth.api.getSession({ headers });
        if (authSession?.user) {
          slpUserId = authSession.user.id;
          console.log(`[GameServer] Found auth session for user ${slpUserId}`);
        }
      } catch (error) {
        console.log("[GameServer] No auth session found, using session-based userId");
      }

      // Just verify session exists (optional check)
      const [session] = await db
        .select()
        .from(therapySessionTable)
        .where(and(eq(therapySessionTable.id, sessionId), isNull(therapySessionTable.deletedAt)))
        .limit(1);

      if (!session) {
        console.warn(`[GameServer] Session ${sessionId} not found, but allowing connection anyway`);
      }

      // Use auth userId if available, otherwise use session-based ID
      userId = slpUserId || `slp-${sessionId}`;
      console.log(`[GameServer] SLP connected (public mode) with userId: ${userId}`);
    } else {
      console.error(`[GameServer] Invalid role: ${role}`);
      ws.close(1008, "Invalid role");
      return;
    }

    // Store connection data on WebSocket
    (ws as any).data = {
      sessionId,
      role,
      userId,
    };

    console.log("[GameServer] WebSocket connection established");

    // Set up message handler
    ws.on("message", (data: Buffer) => {
      handleWebSocketMessage(ws, data.toString());
    });

    // Set up close handler
    ws.on("close", () => {
      handleWebSocketClose(ws);
    });

    // Set up error handler
    ws.on("error", (error) => {
      console.error("[GameServer] WebSocket error:", error);
    });
  } catch (error) {
    console.error("[GameServer] Error setting up WebSocket connection:", error);
    console.error("[GameServer] Error stack:", error instanceof Error ? error.stack : "No stack");
    ws.close(
      1011,
      `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function handleWebSocketMessage(ws: WebSocket, message: string): void {
  try {
    // Extract data from WebSocket
    const data = (ws as any).data as
      | { sessionId: string; role: PlayerRole; userId: string }
      | undefined;
    if (!data) {
      ws.close(1008, "Invalid connection data");
      return;
    }

    const { sessionId, role } = data;

    // Get or create game room
    let room = gameRooms.get(sessionId);
    if (!room) {
      room = new GameRoom(sessionId);
      gameRooms.set(sessionId, room);
    }

    // Parse message
    const parsed = JSON.parse(message);

    // Handle join-game message (first message after connection)
    if (parsed.type === "join-game") {
      // Add player to room
      room.addPlayer({
        id: data.userId,
        role,
        ws,
      });

      // If game not started and both players are present, initialize game
      if (!room.getGameState() && room.hasPlayer("slp") && room.hasPlayer("student")) {
        const defaultPromptSetId = getDefaultPromptSetId();
        room.initializeGame(defaultPromptSetId).catch((error) => {
          console.error("[GameServer] Failed to initialize game:", error);
        });
      } else if (
        room.getGameState()?.status === "waiting" &&
        room.hasPlayer("slp") &&
        room.hasPlayer("student")
      ) {
        // Start game if both players are now present
        room.startGame().catch((error) => {
          console.error("[GameServer] Failed to start game:", error);
        });
      }

      // Send current game state
      const gameState = room.getGameState();
      if (gameState) {
        ws.send(
          JSON.stringify({
            type: "game-state",
            payload: gameState,
            timestamp: new Date().toISOString(),
          }),
        );
      }
    }
    // Other messages are handled by the room's message handler (set up in addPlayer)
  } catch (error) {
    console.error("[GameServer] Error handling message:", error);
    try {
      ws.send(
        JSON.stringify({
          type: "error",
          payload: { message: "Failed to process message", code: "PROCESSING_ERROR" },
          timestamp: new Date().toISOString(),
        }),
      );
    } catch {
      // Ignore send errors
    }
  }
}

function handleWebSocketClose(ws: WebSocket): void {
  try {
    // Extract data from WebSocket
    const data = (ws as any).data as { sessionId: string; role: PlayerRole } | undefined;
    if (data) {
      const room = gameRooms.get(data.sessionId);
      if (room) {
        room.removePlayer(data.role);

        // Clean up room if no players
        if (room.getPlayerCount() === 0) {
          gameRooms.delete(data.sessionId);
        }
      }
    }
  } catch (error) {
    console.error("[GameServer] Error handling close:", error);
  }
}

export function getGameRoom(sessionId: string): GameRoom | undefined {
  return gameRooms.get(sessionId);
}

// Start server
const port = Number(process.env.PORT) || 3000;

server.listen(port, () => {
  console.log(`🚀 Express server is running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔌 WebSocket support enabled at ws://localhost:${port}/ws/game/:sessionId`);
  console.log(`🌐 CORS enabled for: ${env.CORS_ORIGIN}`);
});
