import { relations } from "drizzle-orm";
import { text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";

export const studentTable = createTable(
  "student",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    age: integer("age"),
    inactive: timestamp("inactive"), // null means active
    ...timestamps,
  },
  (table) => [
    index("student_deletedAt_idx").on(table.deletedAt),
    index("student_inactive_idx").on(table.inactive),
  ],
);

export const studentRelations = relations(studentTable, ({ many }) => ({
  // Relations to caseload and therapy sessions are defined in their respective files
}));

// Type exports for TypeScript
export type Student = typeof studentTable.$inferSelect;
export type NewStudent = typeof studentTable.$inferInsert;
