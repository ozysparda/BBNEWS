import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  content: text("content").notNull(),
  terms: boolean("terms").notNull().default(false),
  status: text("status").notNull().default("pending"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({
  id: true,
  status: true,
  ipAddress: true,
  userAgent: true,
  location: true,
  createdAt: true,
  updatedAt: true,
});

export type Complaint = typeof complaintsTable.$inferSelect;
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
