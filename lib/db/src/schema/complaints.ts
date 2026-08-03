import { pgTable, serial, text, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  complaintNumber: text("complaint_number").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  // Legacy compact-payload fields retained for existing clients/data.
  content: text("content").notNull().default(""),
  terms: boolean("terms").notNull().default(false),
  phoneNumber: text("phone_number").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  photoUrl: text("photo_url"),
  videoUrl: text("video_url"),
  pdfUrl: text("pdf_url"),
  status: text("status").notNull().default("pending"),
  adminResponse: text("admin_response"),
  assignedOfficer: text("assigned_officer"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  address: text("address"),
  city: text("city"),
  province: text("province"),
  country: text("country"),
  deviceName: text("device_name"),
  deviceType: text("device_type"),
  operatingSystem: text("operating_system"),
  browser: text("browser"),
  browserVersion: text("browser_version"),
  screenResolution: text("screen_resolution"),
  timezone: text("timezone"),
  localTime: text("local_time"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  language: text("language"),
  deviceFingerprint: text("device_fingerprint"),
  location: text("location"),
  agreementAccepted: text("agreement_accepted").notNull().default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({
  id: true,
  complaintNumber: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});

export type Complaint = typeof complaintsTable.$inferSelect;
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;