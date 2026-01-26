import { createAuth } from "@empat-challenge/auth";
import { createDatabaseClient } from "@empat-challenge/db/client";
import { therapySessionTable, slpTable } from "@empat-challenge/db/schemas";
import { eq, and, isNull } from "drizzle-orm";
import { getEnv } from "../utils/env";
import { GameRoom } from "./game-room";
import type { PlayerRole } from "@empat-challenge/domain/types";

const env = getEnv();
const auth = createAuth(env.CORS_ORIGIN);
const db = createDatabaseClient(env.DATABASE_URL);

// In-memory storage for game rooms
const gameRooms = new Map<string, GameRoom>();

// Card sets - in production, load from JSON file or database
// For now, using a simple structure that matches the JSON format
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

// Default card set (easy animals) - in production, load from JSON
const defaultCardSet: GameCardSet = {
  id: "easy-animals-001",
  name: "Basic Animals",
  difficulty: "easy",
  cards: [
    { id: "word-cat", type: "word", content: "Cat", matchId: "pic-cat" },
    { id: "pic-cat", type: "picture", content: "A fluffy orange cat", matchId: "word-cat" },
    { id: "word-dog", type: "word", content: "Dog", matchId: "pic-dog" },
    { id: "pic-dog", type: "picture", content: "A friendly brown dog", matchId: "word-dog" },
    { id: "word-bird", type: "word", content: "Bird", matchId: "pic-bird" },
    { id: "pic-bird", type: "picture", content: "A colorful bird", matchId: "word-bird" },
    { id: "word-fish", type: "word", content: "Fish", matchId: "pic-fish" },
    { id: "pic-fish", type: "picture", content: "A swimming fish", matchId: "word-fish" },
  ],
};

export async function handleGameWebSocket(request: Request): Promise<Response> {
  // Extract session ID from URL path
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const sessionId = pathParts[pathParts.length - 1];

  if (!sessionId) {
    return new Response("Session ID required", { status: 400 });
  }

  // Extract token and role from query params
  const token = url.searchParams.get("token");
  const roleParam = url.searchParams.get("role");

  if (!roleParam) {
    return new Response("Role required", { status: 400 });
  }

  const role = roleParam as PlayerRole;
  if (role !== "slp" && role !== "student") {
    return new Response("Invalid role", { status: 400 });
  }

  // Validate token and get user
  let userId: string;
  let slpId: string | null = null;

  try {
    if (role === "slp") {
      // For SLP, validate session from cookies (token param can be "cookie" or empty)
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return new Response("Unauthorized", { status: 401 });
      }
      userId = session.user.id;

      // Get SLP record
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, userId), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!slp) {
        return new Response("SLP profile not found", { status: 404 });
      }
      slpId = slp.id;
    } else {
      // For student, validate link token
      if (!token) {
        return new Response("Token required for student", { status: 400 });
      }

      // The token is the linkToken from the session
      const [session] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, sessionId),
            eq(therapySessionTable.linkToken, token),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!session) {
        return new Response("Invalid session token", { status: 401 });
      }
      // Student doesn't have a userId, use session ID as identifier
      userId = `student-${sessionId}`;
    }

    // Verify session exists and is valid
    const [session] = await db
      .select()
      .from(therapySessionTable)
      .where(and(eq(therapySessionTable.id, sessionId), isNull(therapySessionTable.deletedAt)))
      .limit(1);

    if (!session) {
      return new Response("Session not found", { status: 404 });
    }

    // Verify SLP owns the session (for SLP role)
    if (role === "slp" && session.slpId !== slpId) {
      return new Response("Session does not belong to this SLP", { status: 403 });
    }

    // For Bun, use native WebSocket upgrade
    // @ts-expect-error - Bun global
    if (typeof Bun !== "undefined" && Bun.upgrade) {
      try {
        // @ts-expect-error - Bun WebSocket upgrade
        const upgrade = Bun.upgrade(request, {
          data: {
            sessionId,
            role,
            userId,
          },
        });

        if (upgrade) {
          // Set up message and close handlers
          upgrade.socket.addEventListener("message", (event) => {
            handleWebSocketMessage(upgrade.socket, event.data as string | Buffer);
          });

          upgrade.socket.addEventListener("close", () => {
            handleWebSocketClose(upgrade.socket);
          });

          return upgrade.response;
        }
      } catch (error) {
        console.error("[GameServer] WebSocket upgrade error:", error);
      }
    }

    return new Response("WebSocket upgrade failed - Bun not available", { status: 500 });
  } catch (error) {
    console.error("[GameServer] Error handling WebSocket:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

export function handleWebSocketMessage(ws: WebSocket, message: string | Buffer): void {
  try {
    // @ts-expect-error - Bun WebSocket data
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
        room.initializeGame(defaultCardSet, "slp").catch((error) => {
          console.error("[GameServer] Failed to initialize game:", error);
        });
      } else if (room.getGameState()?.status === "waiting" && room.hasPlayer("slp") && room.hasPlayer("student")) {
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

export function handleWebSocketClose(ws: WebSocket): void {
  try {
    // @ts-expect-error - Bun WebSocket data
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
