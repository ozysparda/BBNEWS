import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { commentsTable } from "./comments";

export const commentRepliesTable = pgTable("comment_replies", {
  id: serial("id").primaryKey(),
  parentCommentId: integer("parent_comment_id").notNull().references(() => commentsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  name: text("name"),
  content: text("content").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  isAdminReply: text("is_admin_reply").notNull().default("false"),
  isPinned: text("is_pinned").notNull().default("false"),
  status: text("status").notNull().default("approved"),
  isReported: text("is_reported").notNull().default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const commentRepliesRelations = relations(commentRepliesTable, ({ one }) => ({
  parentComment: one(commentsTable, {
    fields: [commentRepliesTable.parentCommentId],
    references: [commentsTable.id],
  }),
}));

export type CommentReply = typeof commentRepliesTable.$inferSelect;