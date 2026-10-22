import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { commentsTable } from "./comments";

export const commentReactionsTable = pgTable("comment_reactions", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => commentsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  ipAddress: text("ip_address").notNull(),
  deviceFingerprint: text("device_fingerprint"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commentReactionsRelations = relations(commentReactionsTable, ({ one }) => ({
  comment: one(commentsTable, {
    fields: [commentReactionsTable.commentId],
    references: [commentsTable.id],
  }),
}));

export type CommentReaction = typeof commentReactionsTable.$inferSelect;