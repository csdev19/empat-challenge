import { cors } from "@elysiajs/cors";
import { createAuth } from "@empat-challenge/auth";
import { Elysia } from "elysia";
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
import {
  handleGameWebSocket,
  handleWebSocketMessage,
  handleWebSocketClose,
} from "./websocket/game-server";
import { createDatabaseClient } from "@empat-challenge/db/client";
import { therapySessionTable, slpTable } from "@empat-challenge/db/schemas";
import { eq, and, isNull } from "drizzle-orm";

const env = getEnv();
const auth = createAuth(env.CORS_ORIGIN);
const db = createDatabaseClient(env.DATABASE_URL);

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

const app = new Elysia()
  .use(authRoutes)
  .use(apiRoutes)
  .ws("/ws/game/:sessionId", {
    query: {
      token: { type: "string", optional: true },
      role: { type: "string" },
    },
    async open(ws) {
      const sessionId = ws.data.params.sessionId;
      const token = ws.data.query.token;
      const roleParam = ws.data.query.role;

      if (!sessionId || !roleParam) {
        ws.close(1008, "Missing sessionId or role");
        return;
      }

      const role = roleParam as "slp" | "student";
      if (role !== "slp" && role !== "student") {
        ws.close(1008, "Invalid role");
        return;
      }

      // Validate and get user info (similar to handleGameWebSocket)
      try {
        let userId: string;
        let slpId: string | null = null;

        if (role === "slp") {
          // For SLP, validate session from cookies
          const session = await auth.api.getSession({ headers: ws.data.headers || {} });
          if (!session?.user) {
            ws.close(1008, "Unauthorized");
            return;
          }
          userId = session.user.id;

          // Get SLP record
          const [slp] = await db
            .select()
            .from(slpTable)
            .where(and(eq(slpTable.userId, userId), isNull(slpTable.deletedAt)))
            .limit(1);

          if (!slp) {
            ws.close(1008, "SLP profile not found");
            return;
          }
          slpId = slp.id;
        } else {
          // For student, validate link token
          if (!token) {
            ws.close(1008, "Token required for student");
            return;
          }

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
            ws.close(1008, "Invalid session token");
            return;
          }
          userId = `student-${sessionId}`;
        }

        // Verify session exists
        const [session] = await db
          .select()
          .from(therapySessionTable)
          .where(and(eq(therapySessionTable.id, sessionId), isNull(therapySessionTable.deletedAt)))
          .limit(1);

        if (!session) {
          ws.close(1008, "Session not found");
          return;
        }

        // Verify SLP owns the session (for SLP role)
        if (role === "slp" && session.slpId !== slpId) {
          ws.close(1008, "Session does not belong to this SLP");
          return;
        }

        // Store connection data
        // @ts-expect-error - Custom data on WebSocket
        ws.data = { ...ws.data, sessionId, role, userId };

        // Client will send join-game message automatically
        // No need to send it from server
      } catch (error) {
        console.error("[GameServer] Error in WebSocket open:", error);
        ws.close(1011, "Internal server error");
      }
    },
    message(ws, message) {
      handleWebSocketMessage(ws, message as string | Buffer);
    },
    close(ws) {
      handleWebSocketClose(ws);
    },
  });

export type App = typeof app;

// Listen on the port provided by Railway (or default to 3000 for development)
const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔌 WebSocket support enabled`);
});
