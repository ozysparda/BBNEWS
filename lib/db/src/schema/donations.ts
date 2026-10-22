import { pgTable, serial, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Berugak Donasi - campaign donasi yang dibuat admin dari panel admin.
 *
 * Satu campaign = satu halaman publik (/donasi/<slug>) berisi:
 *  - judul campaign + tulisan campaign (konten kaya)
 *  - target donasi (rupiah)
 *  - QR / payload QRIS, rekening bank, dan/atau alamat wallet kripto
 *  - status: draft | active | closed | archived
 */
export const donationCampaignsTable = pgTable("donation_campaigns", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull().default(""),
  coverImageUrl: text("cover_image_url"),

  // Target donasi dalam rupiah penuh (contoh: 5000000 = Rp 5.000.000)
  targetAmount: integer("target_amount").notNull().default(0),

  // QRIS / QR statis
  qrisImageUrl: text("qris_image_url"),
  qrisPayload: text("qris_payload"),

  // Transfer bank manual
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountHolder: text("bank_account_holder"),

  // Kripto (opsional, bisa dipakai bersamaan dengan QRIS)
  cryptoNetwork: text("crypto_network"),
  cryptoSymbol: text("crypto_symbol"),
  cryptoAddress: text("crypto_address"),

  // Auto konfirmasi: khusus kripto (cek tx hash ke explorer publik).
  // Kalau gagal dicek, transaksi tetap "pending" untuk konfirmasi manual admin.
  autoConfirm: boolean("auto_confirm").notNull().default(false),

  // Minimum donasi (rupiah) supaya transaksi di bawahnya ditolak
  minAmount: integer("min_amount").notNull().default(1000),

  status: text("status").notNull().default("draft"),
  startAt: timestamp("start_at"),
  deadline: timestamp("deadline"),

  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("donation_campaigns_status_idx").on(table.status),
}));

/**
 * Satu transaksi donasi = satu percobaan donasi dari donatur.
 * Status: pending (menunggu admin) | verified (sah, masuk total) | rejected.
 */
export const donationTransactionsTable = pgTable("donation_transactions", {
  id: serial("id").primaryKey(),
  referenceNumber: text("reference_number").notNull().unique(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => donationCampaignsTable.id, { onDelete: "cascade" }),
  donorName: text("donor_name").notNull(),
  donorEmail: text("donor_email"),
  donorPhone: text("donor_phone"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),

  // Nominal rupiah (untuk QRIS & transfer bank)
  amount: integer("amount").notNull().default(0),
  // Nominal kripto (mis. "25.5" + symbol USDT) - hanya untuk method crypto
  cryptoAmount: text("crypto_amount"),
  cryptoNetwork: text("crypto_network"),
  txHash: text("tx_hash"),

  method: text("method").notNull().default("qris"),
  message: text("message"),
  proofUrl: text("proof_url"),

  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  verifiedBy: text("verified_by"),
  verifiedAt: timestamp("verified_at"),
  autoVerified: boolean("auto_verified").notNull().default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  campaignIdIdx: index("donation_transactions_campaign_id_idx").on(table.campaignId),
  statusIdx: index("donation_transactions_status_idx").on(table.status),
  createdAtIdx: index("donation_transactions_created_at_idx").on(table.createdAt),
}));

/**
 * Pengaturan global Berugak Donasi (satu baris, id = 1).
 * Dipakai untuk teks hero halaman donasi + QRIS cadangan saat campaign tidak
 * punya QR sendiri.
 */
export const donationSettingsTable = pgTable("donation_settings", {
  id: serial("id").primaryKey(),
  heroTitle: text("hero_title").notNull().default("Berugak Donasi"),
  heroDescription: text("hero_description").notNull().default(""),
  qrisImageUrl: text("qris_image_url"),
  qrisPayload: text("qris_payload"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountHolder: text("bank_account_holder"),
  isOpen: boolean("is_open").notNull().default(true),

  // Popup donasi (opsional) - tampilkan campaign donasi sebagai popup/iklan
  popupEnabled: boolean("popup_enabled").notNull().default(false),
  popupCampaignId: integer("popup_campaign_id"),
  // Penempatan: floating, article-top, article-middle, article-bottom, home-banner
  popupPlacement: text("popup_placement").notNull().default("floating"),
  // Delay (detik) sebelum popup muncul
  popupDelay: integer("popup_delay").notNull().default(5),
  // Bisa ditutup oleh pengunjung
  popupDismissable: boolean("popup_dismissable").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const donationCampaignsRelations = relations(donationCampaignsTable, ({ many }) => ({
  transactions: many(donationTransactionsTable),
}));

export const donationTransactionsRelations = relations(donationTransactionsTable, ({ one }) => ({
  campaign: one(donationCampaignsTable, {
    fields: [donationTransactionsTable.campaignId],
    references: [donationCampaignsTable.id],
  }),
}));

export const insertDonationCampaignSchema = createInsertSchema(donationCampaignsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDonationTransactionSchema = createInsertSchema(donationTransactionsTable).omit({
  id: true,
  referenceNumber: true,
  status: true,
  verifiedBy: true,
  verifiedAt: true,
  autoVerified: true,
  createdAt: true,
  updatedAt: true,
});

export type DonationCampaign = typeof donationCampaignsTable.$inferSelect;
export type InsertDonationCampaign = z.infer<typeof insertDonationCampaignSchema>;
export type DonationTransaction = typeof donationTransactionsTable.$inferSelect;
export type InsertDonationTransaction = z.infer<typeof insertDonationTransactionSchema>;
export type DonationSettings = typeof donationSettingsTable.$inferSelect;
