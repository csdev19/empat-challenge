import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import {
  slpTable,
  type NewSLP,
} from "@empat-challenge/db/schemas";
import {
  createSLPSchema,
  updateSLPSchema,
} from "@empat-challenge/domain/schemas";
import { eq, and, isNull } from "drizzle-orm";
import { NotFoundError, ConflictError } from "../utils/errors";
import { successBody, createdBody } from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { getEnv } from "../utils/env";
import { authMacro } from "@/plugins/auth.plugin";

const env = getEnv();

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

      const [created] = await db
        .insert(slpTable)
        .values(newSLP)
        .returning();

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
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!slp) {
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
