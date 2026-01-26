import { relations } from "drizzle-orm";
import { text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";
import { therapySessionTable } from "./therapy-session";

export const trialDataTable = createTable(
  "trial_data",
  {
    id: text("id").primaryKey(),
    therapySessionId: text("therapy_session_id")
      .notNull()
      .references(() => therapySessionTable.id, { onDelete: "cascade" }),
    trialNumber: integer("trial_number").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("trial_data_therapySessionId_idx").on(table.therapySessionId),
    index("trial_data_timestamp_idx").on(table.timestamp),
    index("trial_data_deletedAt_idx").on(table.deletedAt),
  ],
);

export const trialDataRelations = relations(trialDataTable, ({ one }) => ({
  therapySession: one(therapySessionTable, {
    fields: [trialDataTable.therapySessionId],
    references: [therapySessionTable.id],
  }),
}));

// Type exports for TypeScript
export type TrialData = typeof trialDataTable.$inferSelect;
export type NewTrialData = typeof trialDataTable.$inferInsert;
