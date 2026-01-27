import { cors } from "@elysiajs/cors";
import { createAuth } from "@empat-challenge/auth";
import { Elysia, t } from "elysia";
import { studentRoutes } from "./routes/students";
import { studentProfileRoutes } from "./routes/student-profile";
import { caseloadRoutes } from "./routes/caseload";
import { slpRoutes } from "./routes/slp";
import { therapySessionRoutes } from "./routes/therapy-sessions";
import { sessionLinkRoutes } from "./routes/session-link";
import { trialDataRoutes } from "./routes/trial-data";
import { sessionRecordingRoutes } from "./routes/session-recording";
import { gameOutputRoutes } from "./routes/game-output";
import { getEnv } from "./utils/env";
import { GameRoom } from "./websocket/game-room";
import { getDefaultPromptSetId } from "./utils/prompt-loader";
import type { PlayerRole } from "@empat-challenge/domain/types";

const env = getEnv();

// In-memory storage for game rooms
const gameRooms = new Map<string, GameRoom>();

// Configure CORS once at the app level
const corsConfig = {
  origin: env.CORS_ORIGIN,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  credentials: true,
  maxAge: 86400, // 24 hours
};

const authRoutes = new Elysia().use(cors(corsConfig)).mount(createAuth(env.CORS_ORIGIN).handler);

const apiRoutes = new Elysia({
  prefix: "/api/v1",
})
  .use(cors(corsConfig))
  .use(slpRoutes)
  .use(studentRoutes)
  .use(studentProfileRoutes)
  .use(caseloadRoutes)
  .use(therapySessionRoutes)
  .use(sessionLinkRoutes)
  .use(trialDataRoutes)
  .use(sessionRecordingRoutes)
  .use(gameOutputRoutes)
  .get("/health", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
  }));

// Store all connected hello world clients for broadcasting
const helloClients = new Set<any>();

const app = new Elysia()
  .use(authRoutes)
  .use(apiRoutes)
  .use(cors(corsConfig))
  .ws("/ws/hello", {
    open(ws) {
      console.log("[HelloWorld] Client connected, total:", helloClients.size + 1);
      helloClients.add(ws);

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "hello",
          message: "Connected! You can now send and receive messages.",
          timestamp: new Date().toISOString(),
        }),
      );
    },
    message(ws, message) {
      console.log("[HelloWorld] Received:", message);

      // Broadcast to ALL connected clients (including sender for confirmation)
      const broadcast = JSON.stringify({
        type: "echo",
        original: message,
        response: "Message broadcast to all!",
        timestamp: new Date().toISOString(),
      });

      helloClients.forEach((client) => {
        try {
          client.send(broadcast);
        } catch (e) {
          console.error("[HelloWorld] Failed to send to client:", e);
        }
      });
    },
    close(ws) {
      helloClients.delete(ws);
      console.log("[HelloWorld] Client disconnected, remaining:", helloClients.size);
    },
    error(ws, error) {
      console.error("[HelloWorld] WebSocket error:", error);
      helloClients.delete(ws);
    },
  })
  .ws("/ws/game/:sessionId", {
    query: t.Object({
      role: t.Union([t.Literal("slp"), t.Literal("student")]),
      token: t.Optional(t.String()),
    }),
    open(ws) {
      const sessionId = ws.data.params.sessionId;
      const role = ws.data.query.role as PlayerRole;
      const token = ws.data.query.token || null;

      console.log(
        `[Game] WebSocket connected: session=${sessionId}, role=${role}, token=${token ? "***" : "none"}`,
      );

      if (!role || (role !== "slp" && role !== "student")) {
        console.error("[Game] Invalid role:", role);
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { message: "Invalid role", code: "INVALID_ROLE" },
            timestamp: new Date().toISOString(),
          }),
        );
        ws.close();
        return;
      }

      // Generate userId based on role
      const userId = role === "student" ? `student-${sessionId}` : `slp-${sessionId}`;

      // Store connection data
      (ws.data as any).sessionId = sessionId;
      (ws.data as any).role = role;
      (ws.data as any).userId = userId;

      // Get or create game room
      let room = gameRooms.get(sessionId);
      if (!room) {
        room = new GameRoom(sessionId);
        gameRooms.set(sessionId, room);
        console.log(`[Game] Created new room for session ${sessionId}`);
      }

      // Add player to room
      room.addPlayer({
        id: userId,
        role,
        ws: ws.raw,
      });

      // Initialize game if both players are present and game not started
      if (!room.getGameState() && room.hasPlayer("slp") && room.hasPlayer("student")) {
        const defaultPromptSetId = getDefaultPromptSetId();
        room.initializeGame(defaultPromptSetId).catch((error) => {
          console.error("[Game] Failed to initialize game:", error);
        });
      } else if (
        room.getGameState()?.status === "waiting" &&
        room.hasPlayer("slp") &&
        room.hasPlayer("student")
      ) {
        room.startGame().catch((error) => {
          console.error("[Game] Failed to start game:", error);
        });
      }

      // Send current game state if available
      const gameState = room.getGameState();
      if (gameState) {
        ws.send(
          JSON.stringify({
            type: "game-state",
            payload: gameState,
            timestamp: new Date().toISOString(),
          }),
        );
      } else {
        // Send waiting message
        ws.send(
          JSON.stringify({
            type: "waiting",
            payload: { message: "Waiting for other player to join..." },
            timestamp: new Date().toISOString(),
          }),
        );
      }
    },
    message(ws, message) {
      const sessionId = (ws.data as any).sessionId;
      const role = (ws.data as any).role as PlayerRole;

      console.log(`[Game] Message from ${role} in session ${sessionId}:`, message);

      const room = gameRooms.get(sessionId);
      if (!room) {
        ws.send(
          JSON.stringify({
            type: "error",
            payload: { message: "Game room not found", code: "ROOM_NOT_FOUND" },
            timestamp: new Date().toISOString(),
          }),
        );
        return;
      }

      // The GameRoom handles messages through its own handlers set up in addPlayer
      // But we can also forward messages here if needed for join-game
      if (typeof message === "object" && message !== null) {
        const msg = message as { type: string; payload?: unknown };
        if (msg.type === "join-game") {
          // Player already added in open(), just send current state
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
      }
    },
    close(ws) {
      const sessionId = (ws.data as any).sessionId;
      const role = (ws.data as any).role as PlayerRole;

      console.log(`[Game] WebSocket closed: session=${sessionId}, role=${role}`);

      const room = gameRooms.get(sessionId);
      if (room && role) {
        room.removePlayer(role);
        if (room.getPlayerCount() === 0) {
          gameRooms.delete(sessionId);
          console.log(`[Game] Removed empty room for session ${sessionId}`);
        }
      }
    },
    error(ws, error) {
      console.error("[Game] WebSocket error:", error);
    },
  });

export type App = typeof app;

// Listen on the port provided by Railway (or default to 3000 for development)
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`WebSocket endpoints:`);
  console.log(`  - Hello World: ws://localhost:${port}/ws/hello`);
  console.log(`  - Game: ws://localhost:${port}/ws/game/:sessionId?role=slp|student`);
});
