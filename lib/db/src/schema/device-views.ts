import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { articlesTable } from "./articles";

export const deviceViewsTable = pgTable("device_views", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  deviceFingerprint: text("device_fingerprint").notNull(),
  ipAddress: text("ip_address"),
  lastViewedAt: timestamp("last_viewed_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const deviceViewsRelations = relations(deviceViewsTable, ({ one }) => ({
  article: one(articlesTable, {
    fields: [deviceViewsTable.articleId],
    references: [articlesTable.id],
  }),
}));

export type DeviceView = typeof deviceViewsTable.$inferSelect;