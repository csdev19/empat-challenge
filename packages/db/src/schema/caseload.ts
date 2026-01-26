import { relations } from "drizzle-orm";
import { text, index, unique } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";
import { slpTable } from "./slp";
import { studentTable } from "./student";

export const caseloadTable = createTable(
  "caseload",
  {
    id: text("id").primaryKey(),
    slpId: text("slp_id")
      .notNull()
      .references(() => slpTable.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => studentTable.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("caseload_slpId_idx").on(table.slpId),
    index("caseload_studentId_idx").on(table.studentId),
    index("caseload_deletedAt_idx").on(table.deletedAt),
    unique("caseload_slpId_studentId_unique").on(table.slpId, table.studentId),
  ],
);

export const caseloadRelations = relations(caseloadTable, ({ one }) => ({
  slp: one(slpTable, {
    fields: [caseloadTable.slpId],
    references: [slpTable.id],
  }),
  student: one(studentTable, {
    fields: [caseloadTable.studentId],
    references: [studentTable.id],
  }),
}));

// Type exports for TypeScript
export type Caseload = typeof caseloadTable.$inferSelect;
export type NewCaseload = typeof caseloadTable.$inferInsert;
