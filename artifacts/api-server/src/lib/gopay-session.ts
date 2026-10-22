/**
 * Penyimpanan sesi GoPay Merchant (GoBiz) - terenkripsi di database.
 *
 * Kenapa di DB (bukan env var)?
 *  - Sesi bisa diperbarui otomatis (GoPay memutar refresh token) tanpa perlu
 *    campur tangan admin, dan hasilnya harus langsung dipakai pemicu
 *    auto-verifikasi berikutnya.
 *  - Panel admin jadi lengkap: admin login sekali pakai OTP, lalu sesi
 *    tersimpan; auto-verifikasi (cron/worker) cukup membacanya dari DB.
 *
 * Kunci enkripsi TIDAK disimpan di database. Ambil dari env:
 *   GOPAY_ENCRYPTION_KEY  (disarankan)
 *   atau JWT_SECRET       (fallback, biar tidak wajib menambah env baru)
 *
 * Format ciphertext: `v1.<iv b64url>.<tag b64url>.<cipher b64url>` (AES-256-GCM).
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { db } from "@workspace/db";
import { donationGopayAccountsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const ENCRYPTION_VERSION = "v1";
const KEY_SALT = "berugaknews-donation-gopay-v1";

/** Data sesi yang disimpan terenkripsi. */
export interface StoredGopaySession {
  accessToken: string;
  refreshToken: string | null;
  merchantId: string | null;
  phoneNumber: string | null;
  savedAt: string;
}

function encryptionKey(): Buffer {
  const source = process.env.GOPAY_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!source) {
    throw new Error(
      "GOPAY_ENCRYPTION_KEY (atau JWT_SECRET) wajib diset agar sesi GoPay bisa disimpan dengan aman.",
    );
  }
  return scryptSync(source, KEY_SALT, 32);
}

/** Enkripsi string biasa (AES-256-GCM). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

/** Dekripsi string hasil `encryptSecret`. */
export function decryptSecret(payload: string): string {
  const parts = String(payload || "").split(".");
  if (parts.length !== 4 || parts[0] !== ENCRYPTION_VERSION) {
    throw new Error("Format ciphertext sesi GoPay tidak dikenali.");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const data = Buffer.from(parts[3], "base64url");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Baris konfigurasi integrasi GoPay (tabel tunggal, id = 1). */
export type GopayAccountRow = typeof donationGopayAccountsTable.$inferSelect;

export async function getGopayAccount(): Promise<GopayAccountRow | null> {
  const [row] = await db
    .select()
    .from(donationGopayAccountsTable)
    .where(eq(donationGopayAccountsTable.id, 1))
    .limit(1);
  return row ?? null;
}

export async function upsertGopayAccount(
  values: Partial<typeof donationGopayAccountsTable.$inferInsert>,
): Promise<GopayAccountRow> {
  const [row] = await db
    .insert(donationGopayAccountsTable)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: donationGopayAccountsTable.id, set: values })
    .returning();
  return row;
}

/** Baca sesi GoPay (terdekripsi) dari database, atau null bila belum login. */
export async function loadGopaySession(): Promise<StoredGopaySession | null> {
  const account = await getGopayAccount();
  if (!account?.sessionEncrypted) return null;
  try {
    const parsed = JSON.parse(decryptSecret(account.sessionEncrypted)) as StoredGopaySession;
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch (error) {
    console.error("Gagal mendekripsi sesi GoPay:", error);
    return null;
  }
}

/** Simpan sesi GoPay (terenkripsi). */
export async function saveGopaySession(session: StoredGopaySession): Promise<GopayAccountRow> {
  return upsertGopayAccount({
    sessionEncrypted: encryptSecret(JSON.stringify(session)),
    sessionUpdatedAt: new Date(),
    phoneNumber: session.phoneNumber,
    merchantId: session.merchantId,
    updatedAt: new Date(),
  });
}

/** Hapus sesi GoPay (logout). Token OTP pending juga dibuang. */
export async function clearGopaySession(): Promise<void> {
  await upsertGopayAccount({
    sessionEncrypted: null,
    sessionUpdatedAt: null,
    otpTokenEncrypted: null,
    otpExpiresAt: null,
    updatedAt: new Date(),
  });
}

/** Simpan token OTP sementara (dipakai lanjut ke /goid/token). */
export async function saveOtpToken(otpToken: string, expiresAt: Date): Promise<void> {
  await upsertGopayAccount({
    otpTokenEncrypted: encryptSecret(otpToken),
    otpExpiresAt: expiresAt,
    updatedAt: new Date(),
  });
}

/** Ambil token OTP yang masih berlaku, atau null. */
export async function loadOtpToken(): Promise<{ otpToken: string; expiresAt: Date } | null> {
  const account = await getGopayAccount();
  if (!account?.otpTokenEncrypted || !account.otpExpiresAt) return null;
  if (account.otpExpiresAt.getTime() < Date.now()) return null;
  try {
    return {
      otpToken: decryptSecret(account.otpTokenEncrypted),
      expiresAt: account.otpExpiresAt,
    };
  } catch {
    return null;
  }
}

/** Buang token OTP (sudah dipakai / kedaluwarsa). */
export async function clearOtpToken(): Promise<void> {
  await upsertGopayAccount({ otpTokenEncrypted: null, otpExpiresAt: null, updatedAt: new Date() });
}
