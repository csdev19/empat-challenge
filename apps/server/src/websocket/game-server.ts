import { createAuth } from "@empat-challenge/auth";
import { createDatabaseClient } from "@empat-challenge/db/client";
import { therapySessionTable, slpTable } from "@empat-challenge/db/schemas";
import { eq, and, isNull } from "drizzle-orm";
import { getEnv } from "../utils/env";
import { GameRoom } from "./game-room";
import { getDefaultPromptSetId } from "../utils/prompt-loader";
import type { PlayerRole } from "@empat-challenge/domain/types";

const env = getEnv();
const auth = createAuth(env.CORS_ORIGIN);
const db = createDatabaseClient(env.DATABASE_URL);

// In-memory storage for game rooms
const gameRooms = new Map<string, GameRoom>();

/**
 * Handle WebSocket connection for game sessions (Bun native WebSocket upgrade)
 *
 * Authentication:
 * - Students: Validated by session link token (passed as query param)
 * - SLPs: Validated by authentication cookie and SLP profile ownership
 *
 * Students never need an SLP profile - they are implicitly invited via session link
 */
export async function handleGameWebSocket(request: Request): Promise<Response> {
  try {
    console.log("[GameServer] WebSocket upgrade request received");
    console.log("[GameServer] Request URL:", request.url);

    // Extract session ID from URL path
    const url = new URL(request.url);
    console.log("[GameServer] Parsed URL pathname:", url.pathname);
    const pathParts = url.pathname.split("/").filter((part) => part.length > 0);
    console.log("[GameServer] Path parts:", pathParts);

    // Find sessionId - it should be after "/ws/game/"
    const gameIndex = pathParts.indexOf("game");
    const sessionId =
      gameIndex >= 0 && gameIndex < pathParts.length - 1
        ? pathParts[gameIndex + 1]
        : pathParts[pathParts.length - 1];

    console.log("[GameServer] Extracted sessionId:", sessionId);

    if (!sessionId) {
      console.warn("[GameServer] Connection rejected: missing sessionId");
      return new Response("Session ID required", { status: 400 });
    }

    // Extract token and role from query params
    const token = url.searchParams.get("token");
    const roleParam = url.searchParams.get("role");

    console.log("[GameServer] Query params - role:", roleParam, "token:", token ? "***" : "none");

    if (!roleParam) {
      console.warn("[GameServer] Connection rejected: missing role");
      return new Response("Role required", { status: 400 });
    }

    const role = roleParam as PlayerRole;
    if (role !== "slp" && role !== "student") {
      console.warn(`[GameServer] Connection rejected: invalid role ${roleParam}`);
      return new Response("Invalid role", { status: 400 });
    }

    // Validate token and get user
    console.log(`[GameServer] WebSocket upgrade attempt: role=${role}, sessionId=${sessionId}`);

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
        const authSession = await auth.api.getSession({ headers: request.headers });
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
      return new Response("Invalid role", { status: 400 });
    }

    // For Bun, use native WebSocket upgrade
    // @ts-expect-error - Bun global
    if (typeof Bun !== "undefined" && Bun.upgrade) {
      try {
        console.log("[GameServer] Attempting Bun WebSocket upgrade");
        // @ts-expect-error - Bun WebSocket upgrade
        const upgrade = Bun.upgrade(request, {
          data: {
            sessionId,
            role,
            userId,
          },
        });

        if (upgrade) {
          console.log("[GameServer] WebSocket upgrade successful");
          // Set up message and close handlers
          upgrade.socket.addEventListener("message", (event: any) => {
            handleWebSocketMessage(upgrade.socket, event.data as string | Buffer);
          });

          upgrade.socket.addEventListener("close", () => {
            handleWebSocketClose(upgrade.socket);
          });

          upgrade.socket.addEventListener("error", (error: any) => {
            console.error("[GameServer] WebSocket error:", error);
          });

          return upgrade.response;
        } else {
          console.error("[GameServer] Bun.upgrade returned null/undefined");
        }
      } catch (error) {
        console.error("[GameServer] WebSocket upgrade error:", error);
        console.error(
          "[GameServer] Upgrade error stack:",
          error instanceof Error ? error.stack : "No stack",
        );
        return new Response(
          `WebSocket upgrade failed: ${error instanceof Error ? error.message : String(error)}`,
          { status: 500 },
        );
      }
    } else {
      console.error("[GameServer] Bun or Bun.upgrade not available");
    }

    return new Response("WebSocket upgrade failed - Bun not available", { status: 500 });
  } catch (error) {
    console.error("[GameServer] Error handling WebSocket:", error);
    console.error("[GameServer] Error stack:", error instanceof Error ? error.stack : "No stack");
    return new Response(
      `Internal server error: ${error instanceof Error ? error.message : String(error)}`,
      { status: 500 },
    );
  }
}

export function handleWebSocketMessage(ws: any, message: string | Buffer): void {
  try {
    // Extract data from Elysia WebSocket
    const data = ws.data as { sessionId: string; role: PlayerRole; userId: string } | undefined;
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
    const parsed = JSON.parse(message as string);

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

export function handleWebSocketClose(ws: any): void {
  try {
    // Extract data from Elysia WebSocket
    const data = ws.data as { sessionId: string; role: PlayerRole } | undefined;
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
