import { relations } from "drizzle-orm";
import { text, integer, numeric, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";
import { therapySessionTable } from "./therapy-session";

export const gameOutputTable = createTable(
  "game_output",
  {
    id: text("id").primaryKey(),
    therapySessionId: text("therapy_session_id")
      .notNull()
      .references(() => therapySessionTable.id, { onDelete: "cascade" }),
    gameType: text("game_type").notNull(),
    gameState: jsonb("game_state"),
    score: integer("score"),
    accuracy: numeric("accuracy", { precision: 5, scale: 2 }),
    duration: integer("duration"), // Duration in seconds
    turnsPlayed: integer("turns_played"),
    playerResults: jsonb("player_results"),
    gameEvents: jsonb("game_events"),
    metadata: jsonb("metadata"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    ...timestamps,
  },
  (table) => [
    index("game_output_therapySessionId_idx").on(table.therapySessionId),
    index("game_output_gameType_idx").on(table.gameType),
    index("game_output_completedAt_idx").on(table.completedAt),
    index("game_output_deletedAt_idx").on(table.deletedAt),
  ],
);

export const gameOutputRelations = relations(gameOutputTable, ({ one }) => ({
  therapySession: one(therapySessionTable, {
    fields: [gameOutputTable.therapySessionId],
    references: [therapySessionTable.id],
  }),
}));

// Type exports for TypeScript
export type GameOutput = typeof gameOutputTable.$inferSelect;
export type NewGameOutput = typeof gameOutputTable.$inferInsert;
