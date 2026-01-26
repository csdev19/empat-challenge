import { relations } from "drizzle-orm";
import { text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";
import { userTable } from "./auth";

export const studentTable = createTable(
  "student",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .references(() => userTable.id, { onDelete: "cascade" })
      .unique(), // Optional: links user account to student profile
    name: text("name").notNull(),
    age: integer("age"),
    inactive: timestamp("inactive"), // null means active
    ...timestamps,
  },
  (table) => [
    index("student_userId_idx").on(table.userId),
    index("student_deletedAt_idx").on(table.deletedAt),
    index("student_inactive_idx").on(table.inactive),
  ],
);

export const studentRelations = relations(studentTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [studentTable.userId],
    references: [userTable.id],
  }),
  // Relations to caseload and therapy sessions are defined in their respective files
}));

// Type exports for TypeScript
export type Student = typeof studentTable.$inferSelect;
export type NewStudent = typeof studentTable.$inferInsert;
