import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import {
  sessionRecordingTable,
  therapySessionTable,
  trialDataTable,
  slpTable,
  type NewSessionRecording,
} from "@empat-challenge/db/schemas";
import { updateSessionRecordingSchema } from "@empat-challenge/domain/schemas";
import { eq, and, isNull, sql } from "drizzle-orm";
import { NotFoundError } from "../utils/errors";
import { successBody } from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { getEnv } from "../utils/env";
import { authMacro } from "@/plugins/auth.plugin";

const env = getEnv();

/**
 * Get or create session recording for a therapy session
 */
async function getOrCreateSessionRecording(
  db: ReturnType<typeof createDatabaseClient>,
  therapySessionId: string,
): Promise<{ id: string }> {
  const [existing] = await db
    .select()
    .from(sessionRecordingTable)
    .where(
      and(
        eq(sessionRecordingTable.therapySessionId, therapySessionId),
        isNull(sessionRecordingTable.deletedAt),
      ),
    )
    .limit(1);

  if (existing) {
    return { id: existing.id };
  }

  // Create new session recording
  const newRecording: NewSessionRecording = {
    id: crypto.randomUUID(),
    therapySessionId,
    totalTrials: 0,
    correctTrials: 0,
    incorrectTrials: 0,
  };

  const [created] = await db.insert(sessionRecordingTable).values(newRecording).returning();

  return { id: created?.id || "" };
}

export const sessionRecordingRoutes = new Elysia({ prefix: "/session-recording" })
  .use(errorHandlerPlugin)
  .decorate("db", createDatabaseClient(env.DATABASE_URL))
  .use(authMacro)
  .get(
    "/:therapySessionId",
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

      // Verify session belongs to SLP
      const [session] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, params.therapySessionId),
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!session) {
        throw new NotFoundError("Therapy session not found");
      }

      // Get or create session recording
      const recording = await getOrCreateSessionRecording(db, params.therapySessionId);
      const [recordingData] = await db
        .select()
        .from(sessionRecordingTable)
        .where(eq(sessionRecordingTable.id, recording.id))
        .limit(1);

      // Get all trials for session
      const trials = await db
        .select()
        .from(trialDataTable)
        .where(
          and(
            eq(trialDataTable.therapySessionId, params.therapySessionId),
            isNull(trialDataTable.deletedAt),
          ),
        )
        .orderBy(trialDataTable.trialNumber);

      return successBody({
        ...recordingData,
        trials,
      });
    },
    {
      params: t.Object({
        therapySessionId: t.String(),
      }),
      isAuth: true,
    },
  )
  .put(
    "/:therapySessionId",
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
      const [session] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, params.therapySessionId),
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!session) {
        throw new NotFoundError("Therapy session not found");
      }

      // Get or create session recording
      const recording = await getOrCreateSessionRecording(db, params.therapySessionId);

      // Update behavioral notes
      const [updated] = await db
        .update(sessionRecordingTable)
        .set({
          behavioralNotes: body.behavioralNotes || null,
          updatedAt: new Date(),
        })
        .where(eq(sessionRecordingTable.id, recording.id))
        .returning();

      return successBody(updated);
    },
    {
      params: t.Object({
        therapySessionId: t.String(),
      }),
      body: updateSessionRecordingSchema,
      isAuth: true,
    },
  )
  .post(
    "/:therapySessionId/recalculate",
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

      // Verify session belongs to SLP
      const [session] = await db
        .select()
        .from(therapySessionTable)
        .where(
          and(
            eq(therapySessionTable.id, params.therapySessionId),
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!session) {
        throw new NotFoundError("Therapy session not found");
      }

      // Count all trials for session
      const trialCounts = await db
        .select({
          total: sql<number>`count(*)::int`,
          correct: sql<number>`sum(case when ${trialDataTable.isCorrect} then 1 else 0 end)::int`,
          incorrect: sql<number>`sum(case when not ${trialDataTable.isCorrect} then 1 else 0 end)::int`,
        })
        .from(trialDataTable)
        .where(
          and(
            eq(trialDataTable.therapySessionId, params.therapySessionId),
            isNull(trialDataTable.deletedAt),
          ),
        );

      const counts = trialCounts[0] || { total: 0, correct: 0, incorrect: 0 };
      const total = Number(counts.total) || 0;
      const correct = Number(counts.correct) || 0;
      const incorrect = Number(counts.incorrect) || 0;

      // Calculate accuracy percentage
      const accuracyPercentage = total > 0 ? (correct / total) * 100 : null;

      // Get or create session recording
      const recording = await getOrCreateSessionRecording(db, params.therapySessionId);

      // Update session recording metrics
      const [updated] = await db
        .update(sessionRecordingTable)
        .set({
          totalTrials: total,
          correctTrials: correct,
          incorrectTrials: incorrect,
          accuracyPercentage: accuracyPercentage ? sql`${accuracyPercentage}::numeric(5,2)` : null,
          updatedAt: new Date(),
        })
        .where(eq(sessionRecordingTable.id, recording.id))
        .returning();

      return successBody(updated);
    },
    {
      params: t.Object({
        therapySessionId: t.String(),
      }),
      isAuth: true,
    },
  );
