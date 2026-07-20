import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  content: text("content").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("approved"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const commentsRelations = relations(commentsTable, ({ one }) => ({
  article: one(articlesTable, {
    fields: [commentsTable.articleId],
    references: [articlesTable.id],
  }),
}));

export const insertCommentSchema = createInsertSchema(commentsTable).omit({
  id: true,
  status: true,
  ipAddress: true,
  userAgent: true,
  createdAt: true,
  updatedAt: true,
});

export type Comment = typeof commentsTable.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
