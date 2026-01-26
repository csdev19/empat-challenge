import { relations } from "drizzle-orm";
import { text, integer, numeric, index, unique } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";
import { therapySessionTable } from "./therapy-session";

export const sessionRecordingTable = createTable(
  "session_recording",
  {
    id: text("id").primaryKey(),
    therapySessionId: text("therapy_session_id")
      .notNull()
      .references(() => therapySessionTable.id, { onDelete: "cascade" }),
    behavioralNotes: text("behavioral_notes"),
    totalTrials: integer("total_trials").notNull().default(0),
    correctTrials: integer("correct_trials").notNull().default(0),
    incorrectTrials: integer("incorrect_trials").notNull().default(0),
    accuracyPercentage: numeric("accuracy_percentage", { precision: 5, scale: 2 }),
    ...timestamps,
  },
  (table) => [
    unique("session_recording_therapySessionId_unique").on(table.therapySessionId),
    index("session_recording_therapySessionId_idx").on(table.therapySessionId),
    index("session_recording_deletedAt_idx").on(table.deletedAt),
  ],
);

export const sessionRecordingRelations = relations(sessionRecordingTable, ({ one }) => ({
  therapySession: one(therapySessionTable, {
    fields: [sessionRecordingTable.therapySessionId],
    references: [therapySessionTable.id],
  }),
}));

// Type exports for TypeScript
export type SessionRecording = typeof sessionRecordingTable.$inferSelect;
export type NewSessionRecording = typeof sessionRecordingTable.$inferInsert;
