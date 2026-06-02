import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  adminUsername: text("admin_username").notNull(),
  action: text("action").notNull(),
  articleId: integer("article_id"),
  articleTitle: text("article_title"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ActivityLog = typeof activityLogTable.$inferSelect;
