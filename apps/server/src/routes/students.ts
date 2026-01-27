import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import { studentTable, caseloadTable, slpTable } from "@empat-challenge/db/schemas";
import {
  paginationQuerySchema,
  addStudentsToCaseloadSchema,
} from "@empat-challenge/domain/schemas";
import { eq, and, desc, sql, isNull, notInArray } from "drizzle-orm";
import { NotFoundError, ConflictError, BadRequestError } from "../utils/errors";
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

export const studentRoutes = new Elysia({ prefix: "/students" })
  .use(errorHandlerPlugin)
  .decorate("db", createDatabaseClient(env.DATABASE_URL))
  .use(authMacro)
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
        throw new NotFoundError("SLP profile not found. Please create your SLP profile first.");
      }

      // Get students in SLP's caseload
      const students = await db
        .select({
          id: studentTable.id,
          name: studentTable.name,
          age: studentTable.age,
          inactive: studentTable.inactive,
          createdAt: studentTable.createdAt,
          updatedAt: studentTable.updatedAt,
        })
        .from(caseloadTable)
        .innerJoin(studentTable, eq(caseloadTable.studentId, studentTable.id))
        .where(
          and(
            eq(caseloadTable.slpId, slp.id),
            isNull(caseloadTable.deletedAt),
            isNull(studentTable.deletedAt),
          ),
        )
        .orderBy(desc(studentTable.updatedAt))
        .limit(pagination.limit)
        .offset(pagination.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(caseloadTable)
        .innerJoin(studentTable, eq(caseloadTable.studentId, studentTable.id))
        .where(
          and(
            eq(caseloadTable.slpId, slp.id),
            isNull(caseloadTable.deletedAt),
            isNull(studentTable.deletedAt),
          ),
        );

      const total = countResult[0] ? Number(countResult[0].count) : 0;

      return status(200, successWithPaginationBody(students, pagination, total));
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

      // Verify student is in SLP's caseload
      const [result] = await db
        .select({
          id: studentTable.id,
          name: studentTable.name,
          age: studentTable.age,
          inactive: studentTable.inactive,
          createdAt: studentTable.createdAt,
          updatedAt: studentTable.updatedAt,
        })
        .from(caseloadTable)
        .innerJoin(studentTable, eq(caseloadTable.studentId, studentTable.id))
        .where(
          and(
            eq(caseloadTable.slpId, slp.id),
            eq(studentTable.id, params.id),
            isNull(caseloadTable.deletedAt),
            isNull(studentTable.deletedAt),
          ),
        )
        .limit(1);

      if (!result) {
        throw new NotFoundError("Student not found");
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
  .get(
    "/available",
    async ({ query, status, db, user }) => {
      const pagination = getPaginationParams(query);

      // Get SLP for the authenticated user
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!slp) {
        throw new NotFoundError("SLP profile not found. Please create your SLP profile first.");
      }

      // Get all students NOT in SLP's caseload
      // First, get student IDs already in caseload
      const existingCaseloads = await db
        .select({ studentId: caseloadTable.studentId })
        .from(caseloadTable)
        .where(and(eq(caseloadTable.slpId, slp.id), isNull(caseloadTable.deletedAt)));

      const existingStudentIds = existingCaseloads.map((c) => c.studentId);

      // Get students not in caseload
      const whereConditions = [isNull(studentTable.deletedAt)];
      if (existingStudentIds.length > 0) {
        whereConditions.push(notInArray(studentTable.id, existingStudentIds));
      }

      const students = await db
        .select({
          id: studentTable.id,
          name: studentTable.name,
          age: studentTable.age,
          inactive: studentTable.inactive,
          createdAt: studentTable.createdAt,
          updatedAt: studentTable.updatedAt,
        })
        .from(studentTable)
        .where(and(...whereConditions))
        .orderBy(desc(studentTable.name))
        .limit(pagination.limit)
        .offset(pagination.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(studentTable)
        .where(and(...whereConditions));

      const total = countResult[0] ? Number(countResult[0].count) : 0;

      return status(200, successWithPaginationBody(students, pagination, total));
    },
    {
      query: paginationQuerySchema,
      isAuth: true,
    },
  );
