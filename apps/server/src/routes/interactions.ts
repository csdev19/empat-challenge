import { Elysia, t } from "elysia";
import { db } from "@empat-challenge/db/client";
import {
  hiringProcessTable,
  interactionTable,
  type NewInteraction,
} from "@empat-challenge/db/schemas";
import { eq, and, desc, isNull } from "drizzle-orm";
import { createInteractionSchema, updateInteractionSchema } from "@empat-challenge/domain/schemas";
import { NotFoundError } from "../utils/errors";
import { successBody, createdBody } from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { authMacro } from "@/plugins/auth.plugin";

export const interactionRoutes = new Elysia({
  prefix: "/hiring-processes/:id/interactions",
})
  .use(errorHandlerPlugin)
  .use(authMacro)
  // List interactions
  .get(
    "/",
    async ({ params, user }) => {
      const [hiringProcessRecord] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!hiringProcessRecord) throw new NotFoundError("Hiring process");

      const interactions = await db
        .select()
        .from(interactionTable)
        .where(
          and(eq(interactionTable.hiringProcessId, params.id), isNull(interactionTable.deletedAt)),
        )
        .orderBy(desc(interactionTable.createdAt));

      // Always return an array, even if empty
      return successBody(interactions || []);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      isAuth: true,
    },
  )
  // Create interaction
  .post(
    "/",
    async ({ params, body, status, user }) => {
      const [hiringProcessRecord] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!hiringProcessRecord) throw new NotFoundError("Hiring process");

      const id = crypto.randomUUID();
      const newInteraction: NewInteraction = {
        id,
        hiringProcessId: params.id,
        title: body.title,
        content: body.content,
        type: body.type,
      };

      const [created] = await db.insert(interactionTable).values(newInteraction).returning();
      return status(201, createdBody(created));
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: createInteractionSchema,
      isAuth: true,
    },
  )
  // Update interaction
  .put(
    "/:interactionId",
    async ({ params, body, user }) => {
      const [hiringProcessRecord] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!hiringProcessRecord) throw new NotFoundError("Hiring process");

      const [existing] = await db
        .select()
        .from(interactionTable)
        .where(
          and(eq(interactionTable.id, params.interactionId), isNull(interactionTable.deletedAt)),
        );

      if (!existing) throw new NotFoundError("Interaction");

      const [updated] = await db
        .update(interactionTable)
        .set({
          title: body.title,
          content: body.content,
          type: body.type,
          updatedAt: new Date(),
        })
        .where(eq(interactionTable.id, params.interactionId))
        .returning();

      return successBody(updated);
    },
    {
      params: t.Object({
        id: t.String(),
        interactionId: t.String(),
      }),
      body: updateInteractionSchema,
      isAuth: true,
    },
  )
  // Delete interaction
  .delete(
    "/:interactionId",
    async ({ params, status, user }) => {
      const [hiringProcessRecord] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!hiringProcessRecord) throw new NotFoundError("Hiring process");

      const [existing] = await db
        .select()
        .from(interactionTable)
        .where(
          and(eq(interactionTable.id, params.interactionId), isNull(interactionTable.deletedAt)),
        );

      if (!existing) throw new NotFoundError("Interaction");

      // Soft delete by setting deletedAt timestamp
      await db
        .update(interactionTable)
        .set({ deletedAt: new Date() })
        .where(eq(interactionTable.id, params.interactionId));

      return status(204);
    },
    {
      params: t.Object({
        id: t.String(),
        interactionId: t.String(),
      }),
      isAuth: true,
    },
  );
