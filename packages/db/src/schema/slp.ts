import { relations } from "drizzle-orm";
import { text, index } from "drizzle-orm/pg-core";
import { createTable } from "../utils/table-creator";
import { timestamps } from "../utils/timestamps";
import { userTable } from "./auth";

export const slpTable = createTable(
  "slp",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" })
      .unique(),
    name: text("name").notNull(),
    phone: text("phone"),
    ...timestamps,
  },
  (table) => [
    index("slp_userId_idx").on(table.userId),
    index("slp_deletedAt_idx").on(table.deletedAt),
  ],
);

export const slpRelations = relations(slpTable, ({ one, many }) => ({
  user: one(userTable, {
    fields: [slpTable.userId],
    references: [userTable.id],
  }),
  // Relations to caseload and therapy sessions are defined in their respective files
}));

// Type exports for TypeScript
export type SLP = typeof slpTable.$inferSelect;
export type NewSLP = typeof slpTable.$inferInsert;
