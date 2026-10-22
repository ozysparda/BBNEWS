import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const blockedUsersTable = pgTable("blocked_users", {
  id: serial("id").primaryKey(),
  blockType: text("block_type").notNull(),
  blockValue: text("block_value").notNull(),
  reason: text("reason"),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: text("created_by"),
});

export type BlockedUser = typeof blockedUsersTable.$inferSelect;