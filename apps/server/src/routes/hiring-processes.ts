import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import { hiringProcessTable, type NewHiringProcess } from "@empat-challenge/db/schemas";
import { CURRENCIES, SALARY_RATE_TYPES } from "@empat-challenge/domain/constants";
import {
  createHiringProcessSchema,
  updateHiringProcessSchema,
  paginationQuerySchema,
} from "@empat-challenge/domain/schemas";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { NotFoundError } from "../utils/errors";
import {
  successBody,
  createdBody,
  successWithPaginationBody,
  getPaginationParams,
} from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { getEnv } from "../utils/env";
import { authMacro } from "@/plugins/auth.plugin";

const env = getEnv();

export const hiringProcessRoutes = new Elysia({ prefix: "/hiring-processes" })
  .use(errorHandlerPlugin)
  .decorate("db", createDatabaseClient(env.DATABASE_URL))
  .use(authMacro)
  .get(
    "/",
    async ({ query, status, db, user }) => {
      const pagination = getPaginationParams(query);

      const processes = await db
        .select()
        .from(hiringProcessTable)
        .where(and(eq(hiringProcessTable.userId, user.id), isNull(hiringProcessTable.deletedAt)))
        .orderBy(desc(hiringProcessTable.updatedAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(hiringProcessTable)
        .where(and(eq(hiringProcessTable.userId, user.id), isNull(hiringProcessTable.deletedAt)));

      const total = countResult[0] ? Number(countResult[0].count) : 0;

      return status(200, successWithPaginationBody(processes, pagination, total));
    },
    {
      query: paginationQuerySchema,
      isAuth: true,
    },
  )
  // Get single hiring process
  .get(
    "/:id",
    async ({ params, db, user }) => {
      const [result] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!result) {
        throw new NotFoundError("Hiring process");
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
  // Create new hiring process
  .post(
    "/",
    async ({ body, status, db, user }) => {
      // Generate UUID for new hiring process
      const id = crypto.randomUUID();

      const newHiringProcess: NewHiringProcess = {
        id,
        companyName: body.companyName,
        jobTitle: body.jobTitle,
        status: body.status,
        salary: body.salary,
        currency: body.currency || CURRENCIES.USD,
        salaryRateType: body.salaryRateType || SALARY_RATE_TYPES.MONTHLY,
        userId: user.id,
      };

      const [createdProcess] = await db
        .insert(hiringProcessTable)
        .values(newHiringProcess)
        .returning();

      return status(201, createdBody(createdProcess));
    },
    {
      body: createHiringProcessSchema,
      isAuth: true,
    },
  )
  // Update hiring process
  .put(
    "/:id",
    async ({ params, body, db, user }) => {
      // Check if hiring process exists and belongs to user
      const [existing] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!existing) {
        throw new NotFoundError("Hiring process");
      }

      const [updated] = await db
        .update(hiringProcessTable)
        .set({
          companyName: body.companyName,
          jobTitle: body.jobTitle,
          status: body.status,
          salary: body.salary,
          currency: body.currency || existing.currency || CURRENCIES.USD,
          salaryRateType: body.salaryRateType ?? existing.salaryRateType,
          updatedAt: new Date(),
        })
        .where(eq(hiringProcessTable.id, params.id))
        .returning();

      return successBody(updated);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: updateHiringProcessSchema,
      isAuth: true,
    },
  )
  // Delete hiring process
  .delete(
    "/:id",
    async ({ params, status, db, user }) => {
      // Check if hiring process exists and belongs to user
      const [existing] = await db
        .select()
        .from(hiringProcessTable)
        .where(
          and(
            eq(hiringProcessTable.id, params.id),
            eq(hiringProcessTable.userId, user.id),
            isNull(hiringProcessTable.deletedAt),
          ),
        );

      if (!existing) {
        throw new NotFoundError("Hiring process");
      }

      // Soft delete by setting deletedAt timestamp
      await db
        .update(hiringProcessTable)
        .set({ deletedAt: new Date() })
        .where(eq(hiringProcessTable.id, params.id));

      return status(204);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      isAuth: true,
    },
  );
