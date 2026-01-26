import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import {
  therapySessionTable,
  studentTable,
  slpTable,
} from "@empat-challenge/db/schemas";
import { sessionLinkValidationResponseSchema } from "@empat-challenge/domain/schemas";
import { eq, and, isNull, sql } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { successBody } from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { getEnv } from "../utils/env";
import { THERAPY_SESSION_STATUSES } from "@empat-challenge/domain/constants";

const env = getEnv();

export const sessionLinkRoutes = new Elysia({ prefix: "/session-link" })
  .use(errorHandlerPlugin)
  .decorate("db", createDatabaseClient(env.DATABASE_URL))
  .get(
    "/validate/:linkToken",
    async ({ params, status, db }) => {
      // Look up therapy session by linkToken
      const [session] = await db
        .select({
          id: therapySessionTable.id,
          studentId: therapySessionTable.studentId,
          slpId: therapySessionTable.slpId,
          dailyRoomUrl: therapySessionTable.dailyRoomUrl,
          status: therapySessionTable.status,
          expiresAt: therapySessionTable.expiresAt,
          linkToken: therapySessionTable.linkToken,
        })
        .from(therapySessionTable)
        .innerJoin(studentTable, eq(therapySessionTable.studentId, studentTable.id))
        .innerJoin(slpTable, eq(therapySessionTable.slpId, slpTable.id))
        .where(
          and(
            eq(therapySessionTable.linkToken, params.linkToken),
            isNull(therapySessionTable.deletedAt),
            isNull(studentTable.deletedAt),
            isNull(slpTable.deletedAt),
          ),
        )
        .limit(1);

      if (!session) {
        throw new NotFoundError("Session link not found");
      }

      // Verify link is not expired
      if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
        throw new BadRequestError("Session link has expired");
      }

      // Verify session status allows joining (scheduled or active)
      if (
        session.status !== THERAPY_SESSION_STATUSES.SCHEDULED &&
        session.status !== THERAPY_SESSION_STATUSES.ACTIVE
      ) {
        throw new BadRequestError(
          `Session is ${session.status} and cannot be joined`,
        );
      }

      // Get student and SLP names
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

      // Regenerate student token (tokens can be regenerated as needed)
      // Get room name from dailyRoomUrl or use session ID
      const roomName = `session-${session.linkToken}`;
      const { generateSessionTokens } = await import("../utils/daily-client");
      const { studentToken } = await generateSessionTokens(
        roomName,
        slp.name,
        student.name,
        24 * 60 * 60, // 24 hours expiration
      );

      return status(200, successBody({
        sessionId: session.id,
        studentId: session.studentId,
        studentName: student.name,
        slpId: session.slpId,
        slpName: slp.name,
        dailyRoomUrl: session.dailyRoomUrl,
        studentToken, // This needs to be retrieved from storage or regenerated
        status: session.status,
        expiresAt: session.expiresAt,
      }));
    },
    {
      params: t.Object({
        linkToken: t.String(),
      }),
    },
  );
