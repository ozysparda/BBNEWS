import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { articlesTable } from "./articles";

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  content: text("content").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  deviceFingerprint: text("device_fingerprint"),
  status: text("status").notNull().default("approved"),
  isAdminComment: text("is_admin_comment").notNull().default("false"),
  isPinned: text("is_pinned").notNull().default("false"),
  isEdited: text("is_edited").notNull().default("false"),
  isReported: text("is_reported").notNull().default("false"),
  reportedReason: text("reported_reason"),
  likeCount: integer("like_count").notNull().default(0),
  dislikeCount: integer("dislike_count").notNull().default(0),
  loveCount: integer("love_count").notNull().default(0),
  laughCount: integer("laugh_count").notNull().default(0),
  angryCount: integer("angry_count").notNull().default(0),
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
  location: true,
  deviceFingerprint: true,
  isAdminComment: true,
  isPinned: true,
  isEdited: true,
  isReported: true,
  reportedReason: true,
  likeCount: true,
  dislikeCount: true,
  loveCount: true,
  laughCount: true,
  angryCount: true,
  createdAt: true,
  updatedAt: true,
});

export type Comment = typeof commentsTable.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;