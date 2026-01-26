import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import {
  gameOutputTable,
  therapySessionTable,
  slpTable,
  studentTable,
  type NewGameOutput,
} from "@empat-challenge/db/schemas";
import { createGameOutputSchema, updateGameOutputSchema } from "@empat-challenge/domain/schemas";
import { eq, and, isNull, desc } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { successBody, createdBody } from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { getEnv } from "../utils/env";
import { authMacro } from "@/plugins/auth.plugin";
import { THERAPY_SESSION_STATUSES } from "@empat-challenge/domain/constants";

const env = getEnv();

export const gameOutputRoutes = new Elysia({ prefix: "/game-output" })
  .use(errorHandlerPlugin)
  .decorate("db", createDatabaseClient(env.DATABASE_URL))
  .use(authMacro)
  .post(
    "/",
    async ({ body, status, db, user }) => {
      // Get SLP for the authenticated user
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!slp) {
        throw new NotFoundError("SLP profile not found");
      }

      // Verify session exists and belongs to SLP
      // Try by ID first, then by linkToken
      let [session] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, body.therapySessionId),
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      // If not found by ID, try by linkToken
      if (!session) {
        [session] = await db
          .select()
          .from(therapySessionTable)
          .where(
            and(
              eq(therapySessionTable.linkToken, body.therapySessionId),
              eq(therapySessionTable.slpId, slp.id),
              isNull(therapySessionTable.deletedAt),
            ),
          )
          .limit(1);
      }

      if (!session) {
        throw new NotFoundError("Therapy session not found");
      }

      // Verify session is active
      if (session.status !== THERAPY_SESSION_STATUSES.ACTIVE) {
        throw new BadRequestError(
          `Cannot record game output for session with status: ${session.status}`,
        );
      }

      // Create game output record
      // Drizzle handles JSONB automatically - can pass objects directly
      // Use the actual session ID (not the linkToken if that's what was passed)
      const newGameOutput: NewGameOutput = {
        id: crypto.randomUUID(),
        therapySessionId: session.id,
        gameType: body.gameType,
        gameState: body.gameState || null,
        score: body.score || null,
        accuracy: body.accuracy ? String(body.accuracy) : null,
        duration: body.duration || null,
        turnsPlayed: body.turnsPlayed || null,
        playerResults: body.playerResults || null,
        gameEvents: body.gameEvents || null,
        metadata: body.metadata || null,
        startedAt: body.startedAt || null,
        completedAt: body.completedAt || null,
      };

      const [created] = await db.insert(gameOutputTable).values(newGameOutput).returning();

      return status(201, createdBody(created));
    },
    {
      body: createGameOutputSchema,
      isAuth: true,
    },
  )
  .put(
    "/:id",
    async ({ params, body, db, user }) => {
      // Get SLP for the authenticated user
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!slp) {
        throw new NotFoundError("SLP profile not found");
      }

      // Verify game output belongs to session owned by SLP
      const [gameOutput] = await db
        .select({
          gameOutput: gameOutputTable,
          session: therapySessionTable,
        })
        .from(gameOutputTable)
        .innerJoin(
          therapySessionTable,
          eq(gameOutputTable.therapySessionId, therapySessionTable.id),
        )
        .where(
          and(
            eq(gameOutputTable.id, params.id),
            eq(therapySessionTable.slpId, slp.id),
            isNull(gameOutputTable.deletedAt),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!gameOutput) {
        throw new NotFoundError("Game output not found");
      }

      // Build update object
      // Drizzle handles JSONB automatically - can pass objects directly
      const updateData: Partial<NewGameOutput> = {
        updatedAt: new Date(),
      };

      if (body.gameType !== undefined) updateData.gameType = body.gameType;
      if (body.gameState !== undefined) updateData.gameState = body.gameState || null;
      if (body.score !== undefined) updateData.score = body.score || null;
      if (body.accuracy !== undefined)
        updateData.accuracy = body.accuracy ? String(body.accuracy) : null;
      if (body.duration !== undefined) updateData.duration = body.duration || null;
      if (body.turnsPlayed !== undefined) updateData.turnsPlayed = body.turnsPlayed || null;
      if (body.playerResults !== undefined) updateData.playerResults = body.playerResults || null;
      if (body.gameEvents !== undefined) updateData.gameEvents = body.gameEvents || null;
      if (body.metadata !== undefined) updateData.metadata = body.metadata || null;
      if (body.startedAt !== undefined) updateData.startedAt = body.startedAt || null;
      if (body.completedAt !== undefined) updateData.completedAt = body.completedAt || null;

      const [updated] = await db
        .update(gameOutputTable)
        .set(updateData)
        .where(eq(gameOutputTable.id, params.id))
        .returning();

      return successBody(updated);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: updateGameOutputSchema,
      isAuth: true,
    },
  )
  .get(
    "/",
    async ({ query, db, user }) => {
      const therapySessionIdOrToken = query.therapySessionId;

      if (!therapySessionIdOrToken) {
        throw new BadRequestError("therapySessionId query parameter is required");
      }

      console.log("[game-output] Fetching game outputs", {
        therapySessionIdOrToken,
        userId: user.id,
      });

      // Check if user is SLP or Student
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      const [student] = await db
        .select()
        .from(studentTable)
        .where(and(eq(studentTable.userId, user.id), isNull(studentTable.deletedAt)))
        .limit(1);

      if (!slp && !student) {
        console.error("[game-output] Neither SLP nor Student profile found", { userId: user.id });
        throw new NotFoundError("Profile not found. Please create your profile first.");
      }

      console.log("[game-output] User profile found", {
        isSLP: !!slp,
        isStudent: !!student,
        slpId: slp?.id,
        studentId: student?.id,
      });

      // Try to find session by ID first, then by linkToken
      let [session] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, therapySessionIdOrToken),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      // If not found by ID, try by linkToken
      if (!session) {
        console.log("[game-output] Not found by ID, trying linkToken", {
          linkToken: therapySessionIdOrToken,
        });
        [session] = await db
          .select()
          .from(therapySessionTable)
          .where(
            and(
              eq(therapySessionTable.linkToken, therapySessionIdOrToken),
              isNull(therapySessionTable.deletedAt),
            ),
          )
          .limit(1);
      }

      if (!session) {
        console.error("[game-output] Therapy session not found", {
          therapySessionIdOrToken,
        });
        throw new NotFoundError("Therapy session not found");
      }

      // Verify user has access to this session
      if (slp && session.slpId !== slp.id) {
        console.error("[game-output] Session does not belong to SLP", {
          sessionSlpId: session.slpId,
          userSlpId: slp.id,
        });
        throw new NotFoundError("Therapy session not found");
      }

      if (student && session.studentId !== student.id) {
        console.error("[game-output] Session does not belong to student", {
          sessionStudentId: session.studentId,
          userStudentId: student.id,
        });
        throw new NotFoundError("Therapy session not found");
      }

      console.log("[game-output] Session found", {
        sessionId: session.id,
        linkToken: session.linkToken,
      });

      // Get all game outputs for session
      // Drizzle automatically parses JSONB fields
      // Use the actual session ID (not the linkToken if that's what was passed)
      const gameOutputs = await db
        .select()
        .from(gameOutputTable)
        .where(
          and(eq(gameOutputTable.therapySessionId, session.id), isNull(gameOutputTable.deletedAt)),
        )
        .orderBy(desc(gameOutputTable.createdAt));

      console.log("[game-output] Found game outputs", { count: gameOutputs.length });

      return successBody(gameOutputs);
    },
    {
      query: t.Object({
        therapySessionId: t.String(),
      }),
      isAuth: true,
    },
  )
  .get(
    "/:id",
    async ({ params, db, user }) => {
      // Get SLP for the authenticated user
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!slp) {
        throw new NotFoundError("SLP profile not found");
      }

      // Verify game output belongs to session owned by SLP
      const [gameOutput] = await db
        .select({
          gameOutput: gameOutputTable,
          session: therapySessionTable,
        })
        .from(gameOutputTable)
        .innerJoin(
          therapySessionTable,
          eq(gameOutputTable.therapySessionId, therapySessionTable.id),
        )
        .where(
          and(
            eq(gameOutputTable.id, params.id),
            eq(therapySessionTable.slpId, slp.id),
            isNull(gameOutputTable.deletedAt),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!gameOutput) {
        throw new NotFoundError("Game output not found");
      }

      // Drizzle automatically parses JSONB fields
      return successBody(gameOutput.gameOutput);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      isAuth: true,
    },
  );
