import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import {
  therapySessionTable,
  studentTable,
  caseloadTable,
  slpTable,
  type NewTherapySession,
} from "@empat-challenge/db/schemas";
import {
  generateSessionLinkSchema,
  updateSessionStatusSchema,
  paginationQuerySchema,
} from "@empat-challenge/domain/schemas";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../utils/errors";
import {
  successBody,
  createdBody,
  successWithPaginationBody,
  getPaginationParams,
} from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { getEnv } from "../utils/env";
import { authMacro } from "@/plugins/auth.plugin";
import {
  createDailyRoom,
  generateSessionTokens,
} from "../utils/daily-client";
import { THERAPY_SESSION_STATUSES } from "@empat-challenge/domain/constants";

const env = getEnv();

export const therapySessionRoutes = new Elysia({ prefix: "/therapy-sessions" })
  .use(errorHandlerPlugin)
  .decorate("db", createDatabaseClient(env.DATABASE_URL))
  .use(authMacro)
  .post(
    "/generate-link",
    async ({ body, status, db, user }) => {
      console.log("[generate-link] Starting request", { userId: user.id, body });

      try {
        // Get SLP for the authenticated user
        console.log("[generate-link] Fetching SLP profile for user", user.id);
        const [slp] = await db
          .select()
          .from(slpTable)
          .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
          .limit(1);

        if (!slp) {
          console.error("[generate-link] SLP profile not found for user", user.id);
          throw new NotFoundError("SLP profile not found. Please create your SLP profile first.");
        }

        console.log("[generate-link] SLP found", { slpId: slp.id, slpName: slp.name });

        // Verify student is in SLP's caseload
        console.log("[generate-link] Verifying student in caseload", { studentId: body.studentId });
        const [studentResult] = await db
          .select({
            id: studentTable.id,
            name: studentTable.name,
          })
          .from(caseloadTable)
          .innerJoin(studentTable, eq(caseloadTable.studentId, studentTable.id))
          .where(
            and(
              eq(caseloadTable.slpId, slp.id),
              eq(studentTable.id, body.studentId),
              isNull(caseloadTable.deletedAt),
              isNull(studentTable.deletedAt),
              isNull(studentTable.inactive), // Only active students
            ),
          )
          .limit(1);

        if (!studentResult) {
          console.error("[generate-link] Student not found in caseload", {
            studentId: body.studentId,
            slpId: slp.id,
          });
          throw new NotFoundError(
            "Student not found or not in your caseload. Please add the student to your caseload first.",
          );
        }

        console.log("[generate-link] Student verified", {
          studentId: studentResult.id,
          studentName: studentResult.name,
        });

        // Generate unique link token
        const linkToken = crypto.randomUUID();
        console.log("[generate-link] Generated link token", { linkToken });

        // Create Daily.co room
        const roomName = `session-${linkToken}`;
        console.log("[generate-link] Creating Daily.co room", { roomName });
        const dailyRoom = await createDailyRoom({
          name: roomName,
          privacy: "private",
          properties: {
            max_participants: 10, // Allow multiple students to join
            enable_people_ui: true,
            enable_chat: true,
            enable_prejoin_ui: true,
          },
        });
        console.log("[generate-link] Daily.co room created", {
          roomId: dailyRoom.id,
          roomUrl: dailyRoom.url,
        });

        // Generate meeting tokens for SLP and student
        console.log("[generate-link] Generating session tokens");
        const { slpToken, studentToken } = await generateSessionTokens(
          dailyRoom.name,
          slp.name,
          studentResult.name,
          24 * 60 * 60, // 24 hours expiration
        );
        console.log("[generate-link] Session tokens generated");

        // Create therapy session record
        const sessionId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

        console.log("[generate-link] Creating therapy session record", {
          sessionId,
          slpId: slp.id,
          studentId: studentResult.id,
          dailyRoomId: dailyRoom.id,
        });

        const newSession: NewTherapySession = {
          id: sessionId,
          slpId: slp.id,
          studentId: studentResult.id,
          dailyRoomId: dailyRoom.id,
          dailyRoomUrl: dailyRoom.url,
          linkToken,
          status: THERAPY_SESSION_STATUSES.SCHEDULED,
          expiresAt,
        };

        console.log("[generate-link] Session object prepared", {
          hasStudentId: !!newSession.studentId,
          studentId: newSession.studentId,
        });

        const [createdSession] = await db
          .insert(therapySessionTable)
          .values(newSession)
          .returning();

        console.log("[generate-link] Therapy session created", {
          sessionId: createdSession.id,
          linkToken: createdSession.linkToken,
        });

        // Generate the shareable link URL
        // This would be the frontend URL where students can join
        const frontendBaseUrl = env.CORS_ORIGIN !== "*" ? env.CORS_ORIGIN : "http://localhost:3000";
        const linkUrl = `${frontendBaseUrl}/session/${linkToken}`;

        const response = {
          sessionId: createdSession.id,
          linkToken: createdSession.linkToken,
          linkUrl,
          dailyRoomUrl: createdSession.dailyRoomUrl,
          slpToken,
          studentToken,
          expiresAt: createdSession.expiresAt,
        };

        console.log("[generate-link] Request completed successfully", {
          linkToken: response.linkToken,
          linkUrl: response.linkUrl,
        });

        return status(201, createdBody(response));
      } catch (error) {
        console.error("[generate-link] Error occurred", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          userId: user.id,
          body,
        });
        throw error;
      }
    },
    {
      body: generateSessionLinkSchema,
      isAuth: true,
    },
  )
  .get(
    "/",
    async ({ query, status, db, user }) => {
      const pagination = getPaginationParams(query);

      // Get SLP for the authenticated user
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!slp) {
        throw new NotFoundError("SLP profile not found");
      }

      const sessions = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .orderBy(desc(therapySessionTable.createdAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        );

      const total = countResult[0] ? Number(countResult[0].count) : 0;

      return status(200, successWithPaginationBody(sessions, pagination, total));
    },
    {
      query: paginationQuerySchema,
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

      const [result] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, params.id),
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!result) {
        throw new NotFoundError("Therapy session not found");
      }

      return successBody(result);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      isAuth: true,
    },
  )
  .put(
    "/:id/status",
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

      // Verify session belongs to SLP
      const [existing] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, params.id),
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError("Therapy session not found");
      }

      const updateData: {
        status: string;
        startTime?: Date;
        endTime?: Date;
        duration?: number;
        updatedAt: Date;
      } = {
        status: body.status,
        updatedAt: new Date(),
      };

      // Calculate duration if both start and end times are provided
      if (body.startTime) {
        updateData.startTime = body.startTime;
      }
      if (body.endTime) {
        updateData.endTime = body.endTime;
        if (body.startTime) {
          const durationMs = body.endTime.getTime() - body.startTime.getTime();
          updateData.duration = Math.floor(durationMs / 1000 / 60); // Convert to minutes
        }
      }

      const [updated] = await db
        .update(therapySessionTable)
        .set(updateData)
        .where(eq(therapySessionTable.id, params.id))
        .returning();

      return successBody(updated);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: updateSessionStatusSchema,
      isAuth: true,
    },
  )
  .post(
    "/:id/start",
    async ({ params, status, db, user }) => {
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
      const [existing] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, params.id),
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError("Therapy session not found");
      }

      // Update status to active and set start time
      const [updated] = await db
        .update(therapySessionTable)
        .set({
          status: THERAPY_SESSION_STATUSES.ACTIVE,
          startTime: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(therapySessionTable.id, params.id))
        .returning();

      return status(200, successBody(updated));
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      isAuth: true,
    },
  )
  .post(
    "/:id/end",
    async ({ params, body, status, db, user }) => {
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
      const [existing] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, params.id),
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!existing) {
        throw new NotFoundError("Therapy session not found");
      }

      const endTime = new Date();
      let duration: number | null = null;

      // Calculate duration if start time exists
      if (existing.startTime) {
        const durationMs = endTime.getTime() - new Date(existing.startTime).getTime();
        duration = Math.floor(durationMs / 1000 / 60); // Convert to minutes
      } else if (body?.duration) {
        duration = body.duration;
      }

      // Update status to completed
      const [updated] = await db
        .update(therapySessionTable)
        .set({
          status: THERAPY_SESSION_STATUSES.COMPLETED,
          endTime,
          duration,
          updatedAt: new Date(),
        })
        .where(eq(therapySessionTable.id, params.id))
        .returning();

      return status(200, successBody(updated));
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        duration: t.Optional(t.Number()),
      }),
      isAuth: true,
    },
  )
  .get(
    "/:id/join-info",
    async ({ params, db, user }) => {
      // Look up session by ID (public endpoint for student access, authenticated for SLP)
      const [session] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, params.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!session) {
        throw new NotFoundError("Therapy session not found");
      }

      // Regenerate tokens
      const { generateSessionTokens } = await import("../utils/daily-client");
      const { studentTable, slpTable } = await import("@empat-challenge/db/schemas");
      
      const [student] = await db
        .select({ name: studentTable.name })
        .from(studentTable)
        .where(eq(studentTable.id, session.studentId))
        .limit(1);

      const [slp] = await db
        .select({ name: slpTable.name })
        .from(slpTable)
        .where(eq(slpTable.id, session.slpId))
        .limit(1);

      if (!student || !slp) {
        throw new NotFoundError("Student or SLP not found");
      }

      const roomName = `session-${session.linkToken}`;
      const { slpToken, studentToken } = await generateSessionTokens(
        roomName,
        slp.name,
        student.name,
        24 * 60 * 60, // 24 hours expiration
      );

      // Check if user is authenticated and is the SLP
      let isSLP = false;
      if (user) {
        const [userSlp] = await db
          .select()
          .from(slpTable)
          .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
          .limit(1);
        isSLP = userSlp?.id === session.slpId;
      }

      return successBody({
        dailyRoomUrl: session.dailyRoomUrl,
        studentToken,
        ...(isSLP && { slpToken }), // Only return SLP token if authenticated as SLP
      });
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  );
