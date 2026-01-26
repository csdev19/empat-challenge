import { relations } from "drizzle-orm";
import { text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";
import { gameOutputTable } from "./game-output";

export const gameOutputEventTable = createTable(
  "game_output_event",
  {
    id: text("id").primaryKey(),
    gameOutputId: text("game_output_id")
      .notNull()
      .references(() => gameOutputTable.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    player: text("player").notNull(), // "slp" or "student"
    eventData: jsonb("event_data"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("game_output_event_gameOutputId_idx").on(table.gameOutputId),
    index("game_output_event_timestamp_idx").on(table.timestamp),
  ],
);

export const gameOutputEventRelations = relations(gameOutputEventTable, ({ one }) => ({
  gameOutput: one(gameOutputTable, {
    fields: [gameOutputEventTable.gameOutputId],
    references: [gameOutputTable.id],
  }),
}));

// Type exports for TypeScript
export type GameOutputEvent = typeof gameOutputEventTable.$inferSelect;
export type NewGameOutputEvent = typeof gameOutputEventTable.$inferInsert;
