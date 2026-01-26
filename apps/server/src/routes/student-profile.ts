import { Elysia, t } from "elysia";
import { createDatabaseClient } from "@empat-challenge/db/client";
import { studentTable, slpTable } from "@empat-challenge/db/schemas";
import {
  createStudentProfileSchema,
  updateStudentProfileSchema,
} from "@empat-challenge/domain/schemas";
import { tryCatch } from "@empat-challenge/domain/types";
import { eq, and, isNull } from "drizzle-orm";
import { NotFoundError, ConflictError } from "../utils/errors";
import { successBody, createdBody } from "../utils/response-helpers";
import { errorHandlerPlugin } from "../utils/error-handler-plugin";
import { handleDatabaseResult } from "../utils/error-handlers";
import { getEnv } from "../utils/env";
import { authMacro } from "@/plugins/auth.plugin";

const env = getEnv();

export const studentProfileRoutes = new Elysia({ prefix: "/student-profile" })
  .use(errorHandlerPlugin)
  .decorate("db", createDatabaseClient(env.DATABASE_URL))
  .use(authMacro)
  .get(
    "/",
    async ({ db, user }) => {
      // Get student profile for the authenticated user
      const result = await tryCatch(
        db
          .select()
          .from(studentTable)
          .where(and(eq(studentTable.userId, user.id), isNull(studentTable.deletedAt)))
          .limit(1),
      );

      const student = handleDatabaseResult(
        result,
        "Student profile not found. Please create your student profile first.",
      );

      return successBody(student);
    },
    {
      isAuth: true,
    },
  )
  .post(
    "/",
    async ({ body, db, user, status }) => {
      console.log("body", body);
      // Check if student profile already exists
      let existing;
      try {
        [existing] = await db
          .select()
          .from(studentTable)
          .where(and(eq(studentTable.userId, user.id), isNull(studentTable.deletedAt)))
          .limit(1);
      } catch (error) {
        console.error("[student-profile] Database error checking existing profile:", error);
        throw error;
      }

      if (existing) {
        throw new ConflictError("Student profile already exists");
      }

      // Check if user already has an SLP profile (can't be both)
      let slp;
      try {
        [slp] = await db
          .select()
          .from(slpTable)
          .where(and(eq(slpTable.userId, user.id), isNull(slpTable.deletedAt)))
          .limit(1);
      } catch (error) {
        console.error("[student-profile] Database error checking SLP profile:", error);
        throw error;
      }

      if (slp) {
        throw new ConflictError(
          "You already have an SLP profile. Students and teachers cannot share the same account.",
        );
      }

      // Create student profile
      const newStudent = {
        id: crypto.randomUUID(),
        userId: user.id,
        name: body.name,
        age: body.age,
        inactive: null,
      };

      let created;
      try {
        [created] = await db.insert(studentTable).values(newStudent).returning();
      } catch (error) {
        console.error("[student-profile] Database error creating student profile:", error);
        throw error;
      }

      return status(201, createdBody(created));
    },
    {
      body: createStudentProfileSchema,
      isAuth: true,
    },
  )
  .put(
    "/",
    async ({ body, db, user, status }) => {
      // Get existing student profile
      const getResult = await tryCatch(
        db
          .select()
          .from(studentTable)
          .where(and(eq(studentTable.userId, user.id), isNull(studentTable.deletedAt)))
          .limit(1),
      );

      const student = handleDatabaseResult(getResult, "Student profile not found");

      // Update student profile
      const updateData: Partial<typeof student> = {};
      if (body.name !== undefined) {
        updateData.name = body.name;
      }
      if (body.age !== undefined) {
        updateData.age = body.age;
      }

      const updateResult = await tryCatch(
        db
          .update(studentTable)
          .set(updateData)
          .where(eq(studentTable.id, student.id))
          .returning(),
      );

      const updated = handleDatabaseResult(updateResult, "Failed to update student profile");

      return status(200, successBody(updated));
    },
    {
      body: updateStudentProfileSchema,
      isAuth: true,
    },
  );
