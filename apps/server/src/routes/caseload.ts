import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import {
  caseloadTable,
  slpTable,
  studentTable,
} from "@empat-challenge/db/schemas";
import {
  addStudentsToCaseloadSchema,
} from "@empat-challenge/domain/schemas";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { NotFoundError, ConflictError, BadRequestError } from "../utils/errors";
import {
  successBody,
  createdBody,
} from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { getEnv } from "../utils/env";
import { authMacro } from "@/plugins/auth.plugin";

const env = getEnv();

export const caseloadRoutes = new Elysia({ prefix: "/caseload" })
  .use(errorHandlerPlugin)
  .decorate("db", createDatabaseClient(env.DATABASE_URL))
  .use(authMacro)
  .post(
    "/students",
    async ({ body, status, db, user }) => {
      // Get SLP for the authenticated user
      const [slp] = await db
        .select()
        .from(slpTable)
        .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
        .limit(1);

      if (!slp) {
        throw new NotFoundError("SLP profile not found. Please create your SLP profile first.");
      }

      // Validate that all student IDs exist and are not deleted
      const students = await db
        .select()
        .from(studentTable)
        .where(
          and(
            inArray(studentTable.id, body.studentIds),
            isNull(studentTable.deletedAt),
          ),
        );

      if (students.length !== body.studentIds.length) {
        throw new BadRequestError("One or more student IDs are invalid or not found.");
      }

      // Check which students are already in caseload
      const existingCaseloads = await db
        .select()
        .from(caseloadTable)
        .where(
          and(
            eq(caseloadTable.slpId, slp.id),
            inArray(caseloadTable.studentId, body.studentIds),
            isNull(caseloadTable.deletedAt),
          ),
        );

      const existingStudentIds = existingCaseloads.map((c) => c.studentId);
      const newStudentIds = body.studentIds.filter(
        (id) => !existingStudentIds.includes(id),
      );

      if (newStudentIds.length === 0) {
        throw new ConflictError("All selected students are already in your caseload.");
      }

      // Add new students to caseload
      const newCaseloads = newStudentIds.map((studentId) => ({
        id: crypto.randomUUID(),
        slpId: slp.id,
        studentId,
      }));

      const created = await db
        .insert(caseloadTable)
        .values(newCaseloads)
        .returning();

      return status(201, createdBody({
        added: created.length,
        skipped: existingStudentIds.length,
        addedStudents: created.map((c) => c.studentId),
      }));
    },
    {
      body: addStudentsToCaseloadSchema,
      isAuth: true,
    },
  )
  .delete(
    "/students/:studentId",
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

      // Find and soft delete the caseload entry
      const [caseload] = await db
        .select()
        .from(caseloadTable)
        .where(
          and(
            eq(caseloadTable.slpId, slp.id),
            eq(caseloadTable.studentId, params.studentId),
            isNull(caseloadTable.deletedAt),
          ),
        )
        .limit(1);

      if (!caseload) {
        throw new NotFoundError("Student not found in your caseload");
      }

      await db
        .update(caseloadTable)
        .set({ deletedAt: new Date() })
        .where(eq(caseloadTable.id, caseload.id));

      return status(204);
    },
    {
      params: t.Object({
        studentId: t.String(),
      }),
      isAuth: true,
    },
  );
