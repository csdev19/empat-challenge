import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import {
  trialDataTable,
  therapySessionTable,
  sessionRecordingTable,
  slpTable,
  type NewTrialData,
  type NewSessionRecording,
} from "@empat-challenge/db/schemas";
import {
  createTrialDataSchema,
  trialDataBatchSchema,
} from "@empat-challenge/domain/schemas";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { successBody, createdBody } from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { getEnv } from "../utils/env";
import { authMacro } from "@/plugins/auth.plugin";
import { THERAPY_SESSION_STATUSES } from "@empat-challenge/domain/constants";

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

  const [created] = await db
    .insert(sessionRecordingTable)
    .values(newRecording)
    .returning();

  return { id: created.id };
}

/**
 * Update session recording metrics based on trials
 */
async function updateSessionRecordingMetrics(
  db: ReturnType<typeof createDatabaseClient>,
  therapySessionId: string,
): Promise<void> {
  // Count all trials for the session
  const trialCounts = await db
    .select({
      total: sql<number>`count(*)::int`,
      correct: sql<number>`sum(case when ${trialDataTable.isCorrect} then 1 else 0 end)::int`,
      incorrect: sql<number>`sum(case when not ${trialDataTable.isCorrect} then 1 else 0 end)::int`,
    })
    .from(trialDataTable)
    .where(
      and(
        eq(trialDataTable.therapySessionId, therapySessionId),
        isNull(trialDataTable.deletedAt),
      ),
    );

  const counts = trialCounts[0] || { total: 0, correct: 0, incorrect: 0 };
  const total = Number(counts.total) || 0;
  const correct = Number(counts.correct) || 0;
  const incorrect = Number(counts.incorrect) || 0;

  // Calculate accuracy percentage
  const accuracyPercentage =
    total > 0 ? (correct / total) * 100 : null;

  // Get or create session recording
  const recording = await getOrCreateSessionRecording(db, therapySessionId);

  // Update session recording
  await db
    .update(sessionRecordingTable)
    .set({
      totalTrials: total,
      correctTrials: correct,
      incorrectTrials: incorrect,
      accuracyPercentage: accuracyPercentage
        ? sql`${accuracyPercentage}::numeric(5,2)`
        : null,
      updatedAt: new Date(),
    })
    .where(eq(sessionRecordingTable.id, recording.id));
}

export const trialDataRoutes = new Elysia({ prefix: "/trial-data" })
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
      const [session] = await db
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

      if (!session) {
        throw new NotFoundError("Therapy session not found");
      }

      // Verify session is active
      if (session.status !== THERAPY_SESSION_STATUSES.ACTIVE) {
        throw new BadRequestError(
          `Cannot record trials for session with status: ${session.status}`,
        );
      }

      // Get current trial count for session
      const trialCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(trialDataTable)
        .where(
          and(
            eq(trialDataTable.therapySessionId, body.therapySessionId),
            isNull(trialDataTable.deletedAt),
          ),
        );

      const currentTrialCount = Number(trialCountResult[0]?.count || 0);
      const trialNumber = currentTrialCount + 1;

      // Create trial record
      const newTrial: NewTrialData = {
        id: crypto.randomUUID(),
        therapySessionId: body.therapySessionId,
        trialNumber,
        isCorrect: body.isCorrect,
        timestamp: body.timestamp || new Date(),
        notes: body.notes || null,
      };

      const [created] = await db
        .insert(trialDataTable)
        .values(newTrial)
        .returning();

      // Update session recording metrics
      await updateSessionRecordingMetrics(db, body.therapySessionId);

      return status(201, createdBody(created));
    },
    {
      body: createTrialDataSchema,
      isAuth: true,
    },
  )
  .post(
    "/batch",
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
      const [session] = await db
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

      if (!session) {
        throw new NotFoundError("Therapy session not found");
      }

      // Verify session is active
      if (session.status !== THERAPY_SESSION_STATUSES.ACTIVE) {
        throw new BadRequestError(
          `Cannot record trials for session with status: ${session.status}`,
        );
      }

      // Get current trial count for session
      const trialCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(trialDataTable)
        .where(
          and(
            eq(trialDataTable.therapySessionId, body.therapySessionId),
            isNull(trialDataTable.deletedAt),
          ),
        );

      const currentTrialCount = Number(trialCountResult[0]?.count || 0);

      // Create all trial records with sequential trial numbers
      const newTrials: NewTrialData[] = body.trials.map((trial, index) => ({
        id: crypto.randomUUID(),
        therapySessionId: body.therapySessionId,
        trialNumber: currentTrialCount + index + 1,
        isCorrect: trial.isCorrect,
        timestamp: trial.timestamp || new Date(),
        notes: trial.notes || null,
      }));

      const created = await db
        .insert(trialDataTable)
        .values(newTrials)
        .returning();

      // Update session recording metrics
      await updateSessionRecordingMetrics(db, body.therapySessionId);

      return status(201, createdBody(created));
    },
    {
      body: trialDataBatchSchema,
      isAuth: true,
    },
  )
  .get(
    "/",
    async ({ query, db, user }) => {
      const therapySessionId = query.therapySessionId;

      if (!therapySessionId) {
        throw new BadRequestError("therapySessionId query parameter is required");
      }

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
            eq(therapySessionTable.id, therapySessionId),
            eq(therapySessionTable.slpId, slp.id),
            isNull(therapySessionTable.deletedAt),
          ),
        )
        .limit(1);

      if (!session) {
        throw new NotFoundError("Therapy session not found");
      }

      // Get all trials for session
      const trials = await db
        .select()
        .from(trialDataTable)
        .where(
          and(
            eq(trialDataTable.therapySessionId, therapySessionId),
            isNull(trialDataTable.deletedAt),
          ),
        )
        .orderBy(trialDataTable.trialNumber);

      return successBody(trials);
    },
    {
      query: t.Object({
        therapySessionId: t.String(),
      }),
      isAuth: true,
    },
  );
