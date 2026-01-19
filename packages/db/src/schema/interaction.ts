import { relations } from "drizzle-orm";
import { text, index } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";
import { hiringProcessTable } from "./hiring-process";
import { interactionTypeEnum } from "../enums";

export const interactionTable = createTable(
  "interaction",
  {
    id: text("id").primaryKey(),
    hiringProcessId: text("hiring_process_id")
      .notNull()
      .references(() => hiringProcessTable.id, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content").notNull(),
    type: interactionTypeEnum("type").default("note"),
    ...timestamps,
  },
  (table) => [
    index("interaction_hiringProcessId_idx").on(table.hiringProcessId),
    index("interaction_createdAt_idx").on(table.createdAt),
    index("interaction_deletedAt_idx").on(table.deletedAt),
  ],
);

export const interactionRelations = relations(interactionTable, ({ one }) => ({
  hiringProcess: one(hiringProcessTable, {
    fields: [interactionTable.hiringProcessId],
    references: [hiringProcessTable.id],
  }),
}));

// Type exports for TypeScript
export type Interaction = typeof interactionTable.$inferSelect;
export type NewInteraction = typeof interactionTable.$inferInsert;
