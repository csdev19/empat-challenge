import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import { slpTable, type NewSLP } from "@empat-challenge/db/schemas";
import { createSLPSchema, updateSLPSchema } from "@empat-challenge/domain/schemas";
import { eq, and, isNull } from "drizzle-orm";
import { NotFoundError, ConflictError } from "../utils/errors";
import { successBody, createdBody } from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { getEnv } from "../utils/env";
import { authMacro } from "@/plugins/auth.plugin";

const env = getEnv();

/**
 * SLP Routes
 * 
 * These endpoints are for Speech Language Pathologists (SLPs/Teachers) only.
 * 
 * IMPORTANT: Students may call these endpoints as part of role detection (useUserRole hook).
 * This is expected behavior - the endpoint will return 404 "SLP profile not found" for students,
 * which is used by the frontend to determine the user is not an SLP.
 * 
 * All endpoints require authentication (isAuth: true) and operate on the authenticated user's profile.
 */
export const slpRoutes = new Elysia({ prefix: "/slp" })
  .use(errorHandlerPlugin)
  .decorate("db", createDatabaseClient(env.DATABASE_URL))
  .use(authMacro)
  .post(
    "/",
    async ({ body, status, db, user }) => {
      // Check if SLP profile already exists for this user
      const [existing] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      if (existing) {
        throw new ConflictError("SLP profile already exists for this user");
      }

      // Create SLP profile
      const newSLP: NewSLP = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: body.name,
        phone: body.phone || null,
      };

      const [created] = await db.insert(slpTable).values(newSLP).returning();

      return status(201, createdBody(created));
    },
    {
      body: createSLPSchema,
      isAuth: true,
    },
  )
  .get(
    "/",
    async ({ db, user }) => {
      // This endpoint is SLP-only
      // If the user doesn't have an SLP profile, they're either:
      // 1. A student (should not access this endpoint)
      // 2. An authenticated user who hasn't created an SLP profile yet
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!slp) {
        // Return 404 - this is expected for non-SLP users (students, or users without SLP profile)
        // The frontend uses this to determine user role, so 404 is semantically correct
        throw new NotFoundError("SLP profile not found");
      }

      return successBody(slp);
    },
    {
      isAuth: true,
    },
  )
  .put(
    "/",
    async ({ body, db, user }) => {
      // Get existing SLP profile
      const [existing] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!existing) {
        throw new NotFoundError("SLP profile not found");
      }

      // Update SLP profile
      const updateData: Partial<NewSLP> = {
        updatedAt: new Date(),
      };

      if (body.name !== undefined) updateData.name = body.name;
      if (body.phone !== undefined) updateData.phone = body.phone || null;

      const [updated] = await db
        .update(slpTable)
        .set(updateData)
        .where(eq(slpTable.id, existing.id))
        .returning();

      return successBody(updated);
    },
    {
      body: updateSLPSchema,
      isAuth: true,
    },
  );
