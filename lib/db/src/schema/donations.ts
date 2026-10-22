import { pgTable, serial, text, integer, boolean, timestamp, index, jsonb } from "drizzle-orm/pg-core";
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

  // Minimum donasi (rupiah) supaya transaksi di bawahnya ditolak
  // (opsional per campaign; jika null pakai global dari donation_settings)
  minAmount: integer("min_amount"),

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

  // Nominal rupiah (untuk QRIS & transfer bank).
  // Ini = nilai donasi yang dihitung ke total campaign (bersih, setelah MDR).
  amount: integer("amount").notNull().default(0),
  // Nominal yang benar-benar dibayar donatur = amount + feeAmount.
  // Berbeda dari `amount` hanya kalau MDR QRIS ditanggung donatur.
  grossAmount: integer("gross_amount"),
  // Biaya MDR/MDR-like yang ditanggung donatur (rupiah penuh).
  feeAmount: integer("fee_amount"),
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

  // Kripto
  cryptoNetwork: text("crypto_network"),
  cryptoSymbol: text("crypto_symbol"),
  cryptoAddress: text("crypto_address"),

  // Auto konfirmasi: khusus kripto (cek tx hash ke explorer publik).
  autoConfirm: boolean("auto_confirm").notNull().default(false),

  // Minimum donasi global (rupiah)
  minAmount: integer("min_amount").notNull().default(1000),

  /**
   * MDR/biaya QRIS merchant dalam basis points persen (70 = 0,70%).
   *
   * Bila nilainya > 0, biaya tersebut dibebankan ke donatur: nominal QRIS
   * menjadi `amount + fee`, sehingga nominal bersih yang masuk ke saldo
   * penampung tetap sama dengan nominal donasi yang ditulis donatur.
   * Isi 0 kalau kategori merchant-mu "Donasi/Bantuan Sosial" (MDR 0%).
   */
  qrisFeeBps: integer("qris_fee_bps").notNull().default(0),

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

/**
 * Akun GoPay Merchant (GoBiz) yang dipakai untuk membaca mutasi QRIS.
 *
 * Satu baris saja (id = 1) - barcode konfigurasi integrasi auto-verifikasi.
 * Token sesi & token OTP disimpan terenkripsi (AES-256-GCM) supaya tidak
 * bisa dibaca langsung dari dump database.
 */
export const donationGopayAccountsTable = pgTable("donation_gopay_accounts", {
  id: serial("id").primaryKey(),
  // Nomor HP akun GoPay Merchant (format 62xxx, tanpa "+").
  phoneNumber: text("phone_number"),
  // Merchant id hasil login (dipakai sebagai filter feed mutasi).
  merchantId: text("merchant_id"),
  // Sesi login terenkripsi: { accessToken, refreshToken, savedAt }.
  sessionEncrypted: text("session_encrypted"),
  sessionUpdatedAt: timestamp("session_updated_at"),
  // Token OTP sementara (dipakai lanjut ke /goid/token), terenkripsi.
  otpTokenEncrypted: text("otp_token_encrypted"),
  otpExpiresAt: timestamp("otp_expires_at"),
  // Auto-verifikasi menyala? (dipakai oleh pemicu eksternal: cron / worker).
  autoVerifyEnabled: boolean("auto_verify_enabled").notNull().default(false),
  // Seberapa jauh ke belakang feed mutasi dipindai (menit).
  autoVerifyWindowMinutes: integer("auto_verify_window_minutes").notNull().default(60),
  // Terakhir kali mutasi dicek (manual maupun otomatis).
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Riwayat satu kali pemeriksaaan mutasi QRIS.
 *
 * Dipakai panel admin untuk melihat: apakah auto-verifikasi berjalan,
 * kapan terakhir jalan, berapa transaksi yang berhasil dicocokkan, dan
 * transaksi mana yang perlu diperiksa manual.
 */
export const donationVerificationRunsTable = pgTable("donation_verification_runs", {
  id: serial("id").primaryKey(),
  // "manual" (tombol di panel admin) | "auto" (dipicu cron/worker)
  source: text("source").notNull().default("manual"),
  // "ok" | "error" | "skipped"
  status: text("status").notNull().default("ok"),
  message: text("message"),
  // Jumlah baris mutasi yang dibaca dari feed GoPay.
  feedCount: integer("feed_count").notNull().default(0),
  // Berapa transaksi donasi yang berhasil dicocokkan & diverifikasi.
  matchedCount: integer("matched_count").notNull().default(0),
  pendingBefore: integer("pending_before").notNull().default(0),
  pendingAfter: integer("pending_after").notNull().default(0),
  // Rincian tambahan (kandidat ambigu, error, dsb) - jsonb.
  details: jsonb("details"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index("donation_verification_runs_created_at_idx").on(table.createdAt),
  sourceIdx: index("donation_verification_runs_source_idx").on(table.source),
}));

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
export type DonationGopayAccount = typeof donationGopayAccountsTable.$inferSelect;
export type InsertDonationGopayAccount = typeof donationGopayAccountsTable.$inferInsert;
export type DonationVerificationRun = typeof donationVerificationRunsTable.$inferSelect;
