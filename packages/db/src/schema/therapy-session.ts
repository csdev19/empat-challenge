import { relations } from "drizzle-orm";
import { text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";
import { slpTable } from "./slp";
import { studentTable } from "./student";
import { therapySessionStatusEnum } from "../enums/therapy-session-status";

export const therapySessionTable = createTable(
  "therapy_session",
  {
    id: text("id").primaryKey(),
    slpId: text("slp_id")
      .notNull()
      .references(() => slpTable.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => studentTable.id, { onDelete: "cascade" }),
    dailyRoomId: text("daily_room_id").notNull(),
    dailyRoomUrl: text("daily_room_url").notNull(),
    linkToken: text("link_token").notNull().unique(),
    status: therapySessionStatusEnum("status").notNull().default("scheduled"),
    expiresAt: timestamp("expires_at"), // Link expiration time
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    duration: integer("duration"), // Duration in minutes
    ...timestamps,
  },
  (table) => [
    index("therapy_session_slpId_idx").on(table.slpId),
    index("therapy_session_studentId_idx").on(table.studentId),
    index("therapy_session_linkToken_idx").on(table.linkToken),
    index("therapy_session_status_idx").on(table.status),
    index("therapy_session_deletedAt_idx").on(table.deletedAt),
  ],
);

export const therapySessionRelations = relations(therapySessionTable, ({ one }) => ({
  slp: one(slpTable, {
    fields: [therapySessionTable.slpId],
    references: [slpTable.id],
  }),
  student: one(studentTable, {
    fields: [therapySessionTable.studentId],
    references: [studentTable.id],
  }),
}));

// Type exports for TypeScript
export type TherapySession = typeof therapySessionTable.$inferSelect;
export type NewTherapySession = typeof therapySessionTable.$inferInsert;
