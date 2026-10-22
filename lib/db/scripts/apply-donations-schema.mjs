/**
 * Terapkan skema tabel Berugak Donasi ke database (Neon Postgres).
 *
 * Skrip ini SANGAT aman: hanya menjalankan `CREATE TABLE IF NOT EXISTS`,
 * `CREATE INDEX IF NOT EXISTS`, dan `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`,
 * jadi tidak pernah menghapus atau mengubah data yang sudah ada.
 * Aman dipanggil berulang kali (idempoten).
 */
import { Client } from "pg";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "donation_campaigns" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" text NOT NULL,
    "title" text NOT NULL,
    "excerpt" text DEFAULT '' NOT NULL,
    "content" text DEFAULT '' NOT NULL,
    "cover_image_url" text,
    "target_amount" integer DEFAULT 0 NOT NULL,
    "qris_image_url" text,
    "qris_payload" text,
    "bank_name" text,
    "bank_account_number" text,
    "bank_account_holder" text,
    "crypto_network" text,
    "crypto_symbol" text,
    "crypto_address" text,
    "auto_confirm" boolean DEFAULT false NOT NULL,
    "min_amount" integer,
    "status" text DEFAULT 'draft' NOT NULL,
    "start_at" timestamp,
    "deadline" timestamp,
    "created_by" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "donation_campaigns_slug_unique" UNIQUE("slug")
  )`,

  `CREATE TABLE IF NOT EXISTS "donation_transactions" (
    "id" serial PRIMARY KEY NOT NULL,
    "reference_number" text NOT NULL,
    "campaign_id" integer NOT NULL,
    "donor_name" text NOT NULL,
    "donor_email" text,
    "donor_phone" text,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    "amount" integer DEFAULT 0 NOT NULL,
    "crypto_amount" text,
    "crypto_network" text,
    "tx_hash" text,
    "method" text DEFAULT 'qris' NOT NULL,
    "message" text,
    "proof_url" text,
    "status" text DEFAULT 'pending' NOT NULL,
    "admin_note" text,
    "verified_by" text,
    "verified_at" timestamp,
    "auto_verified" boolean DEFAULT false NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "donation_transactions_reference_number_unique" UNIQUE("reference_number"),
    CONSTRAINT "donation_transactions_campaign_id_donation_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "donation_campaigns"("id") ON DELETE cascade
  )`,

  `CREATE TABLE IF NOT EXISTS "donation_settings" (
    "id" serial PRIMARY KEY NOT NULL,
    "hero_title" text DEFAULT 'Berugak Donasi' NOT NULL,
    "hero_description" text DEFAULT '' NOT NULL,
    "qris_image_url" text,
    "qris_payload" text,
    "bank_name" text,
    "bank_account_number" text,
    "bank_account_holder" text,
    "is_open" boolean NOT NULL DEFAULT true,
    "popup_enabled" boolean NOT NULL DEFAULT false,
    "popup_campaign_id" integer,
    "popup_placement" text NOT NULL DEFAULT 'floating',
    "popup_delay" integer NOT NULL DEFAULT 5,
    "popup_dismissable" boolean NOT NULL DEFAULT true,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS "donation_campaigns_status_idx" ON "donation_campaigns" ("status")`,
  `CREATE INDEX IF NOT EXISTS "donation_transactions_campaign_id_idx" ON "donation_transactions" ("campaign_id")`,
  `CREATE INDEX IF NOT EXISTS "donation_transactions_status_idx" ON "donation_transactions" ("status")`,
  `CREATE INDEX IF NOT EXISTS "donation_transactions_created_at_idx" ON "donation_transactions" ("created_at")`,

  // ALTER TABLE untuk DB yang sudah ada (idempoten)
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "popup_enabled" boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "popup_campaign_id" integer`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "popup_placement" text NOT NULL DEFAULT 'floating'`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "popup_delay" integer NOT NULL DEFAULT 5`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "popup_dismissable" boolean NOT NULL DEFAULT true`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "qris_image_url" text`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "qris_payload" text`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "bank_name" text`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "bank_account_number" text`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "bank_account_holder" text`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "crypto_network" text`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "crypto_symbol" text`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "crypto_address" text`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "auto_confirm" boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "donation_settings" ADD COLUMN IF NOT EXISTS "min_amount" integer NOT NULL DEFAULT 1000`,

  // min_amount per campaign: nullable (jika null pakai global dari donation_settings)
  `ALTER TABLE "donation_campaigns" ALTER COLUMN "min_amount" DROP NOT NULL`,
];

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    null
  );
}

async function main() {
  const url = getDatabaseUrl();
  if (!url) {
    console.log("[migrate:donations] Lewati - tidak ada POSTGRES_URL/DATABASE_URL di environment.");
    return;
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    for (const statement of STATEMENTS) {
      await client.query(statement);
    }
    console.log("[migrate:donations] Skema Berugak Donasi siap (tabel & index dibuat).");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[migrate:donations] Gagal menerapkan skema:", error?.message || error);
  process.exit(1);
});
