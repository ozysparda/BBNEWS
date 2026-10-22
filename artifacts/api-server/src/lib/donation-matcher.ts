/**
 * Orkestrasi auto-verifikasi donasi QRIS (versi yang menyentuh database).
 *
 * Fungsi pencocokan yang murni ada di `donation-matching.ts` (bisa diuji
 * tanpa koneksi DB). File ini menangani:
 *  - menarik feed mutasi dari GoPay Merchant,
 *  - memuat transaksi donasi yang masih pending,
 *  - menyimpan hasil pencocokan ke database,
 *  - mencatat riwayat pemeriksaan.
 *
 * ATURAN PENCOCOKAN (detail di `donation-matching.ts`):
 *  1. Nominal dicocokkan dari nominal yang dibayar (amount + fee MDR).
 *  2. Mutasi lama (sebelum transaksi dibuat) tidak boleh dipakai.
 *  3. Satu mutasi hanya untuk satu transaksi (dedupe).
 *  4. Kandidat nyaris bersamaan -> ambigu, dibiarkan pending.
 */

import { db } from "@workspace/db";
import { donationTransactionsTable, donationVerificationRunsTable } from "@workspace/db/schema";
import { and, asc, desc, eq, gte } from "drizzle-orm";
import {
  GopayError,
  fetchProfile,
  fetchQrissFeed,
  filterPaidQrissEntries,
  refreshSession,
  type QrisFeedEntry,
} from "./gopay";
import {
  loadGopaySession,
  saveGopaySession,
  upsertGopayAccount,
  type StoredGopaySession,
} from "./gopay-session";
import { matchDonationsToFeed, type PendingDonation } from "./donation-matching";

export {
  matchDonationsToFeed,
  type AmbiguousDonation,
  type DonationMatch,
  type MatchOptions,
  type MatchResult,
  type PendingDonation,
} from "./donation-matching";

export interface VerificationRunOptions {
  /** "manual" (tombol panel admin) atau "auto" (cron/worker). */
  source: "manual" | "auto";
  /** Seberapa jauh ke belakang feed dipindai (menit). Default 60. */
  windowMinutes?: number;
  /** Admin yang memicu (kalau manual). */
  actor?: string | null;
}

export interface VerificationRunResult {
  status: "ok" | "skipped" | "error";
  message: string;
  feedCount: number;
  matchedCount: number;
  pendingBefore: number;
  pendingAfter: number;
  matches: Array<{
    transactionId: number;
    referenceNumber: string;
    amount: number;
    grossAmount: number;
    orderId: string | null;
    paidAt: string;
  }>;
  ambiguous: Array<{
    transactionId: number;
    referenceNumber: string;
    grossAmount: number;
    candidateCount: number;
  }>;
}

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

/**
 * Jalankan satu siklus verifikasi mutasi.
 *
 * Dipakai oleh dua pemicu:
 *  - tombol "Cek Mutasi Sekarang" di panel admin (source = manual)
 *  - cron / worker eksternal (source = auto)
 */
export async function runQrissVerification(
  options: VerificationRunOptions,
): Promise<VerificationRunResult> {
  const windowMinutes = Math.max(5, Math.min(options.windowMinutes ?? 60, 7 * 24 * 60));
  const empty: VerificationRunResult = {
    status: "ok",
    message: "",
    feedCount: 0,
    matchedCount: 0,
    pendingBefore: 0,
    pendingAfter: 0,
    matches: [],
    ambiguous: [],
  };

  let session = await loadGopaySession();
  if (!session) {
    return {
      ...empty,
      status: "error",
      message: "Belum terhubung ke akun GoPay Merchant. Login dengan OTP dulu di panel admin.",
    };
  }

  const startTime = new Date(Date.now() - windowMinutes * 60 * 1000);

  let feed: QrisFeedEntry[] = [];
  let profileRefreshed = false;
  try {
    feed = await fetchQrissFeed({
      accessToken: session.accessToken,
      merchantId: session.merchantId,
      startTime,
      endTime: new Date(),
      size: 100,
    });
  } catch (error: any) {
    const expired = error instanceof GopayError && (error.status === 401 || error.status === 403);
    if (expired && session.refreshToken) {
      try {
        const refreshed = await refreshSession(session.refreshToken);
        session = {
          ...session,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? session.refreshToken,
          savedAt: new Date().toISOString(),
        };
        await saveGopaySession(session);
        feed = await fetchQrissFeed({
          accessToken: session.accessToken,
          merchantId: session.merchantId,
          startTime,
          endTime: new Date(),
          size: 100,
        });
        profileRefreshed = true;
      } catch (refreshError: any) {
        return {
          ...empty,
          status: "error",
          message: `Sesi GoPay kedaluwarsa: ${refreshError?.message || "gagal refresh"}`,
        };
      }
    } else {
      return {
        ...empty,
        status: "error",
        message: `Gagal membaca mutasi GoPay: ${error?.message || "tidak diketahui"}`,
      };
    }
  }

  // Merchant id masih kosong? Ambil dari profil (dipakai sebagai filter feed).
  if (!session.merchantId) {
    try {
      const profile = await fetchProfile(session.accessToken);
      if (profile.merchantId) {
        session = { ...session, merchantId: profile.merchantId };
        await saveGopaySession(session);
      }
    } catch {
      // Tidak wajib: feed tetap bisa dibaca tanpa filter merchant.
    }
  }

  const paidEntries = filterPaidQrissEntries(feed);

  const pendingBefore = await db
    .select({ id: donationTransactionsTable.id })
    .from(donationTransactionsTable)
    .where(
      and(
        eq(donationTransactionsTable.status, "pending"),
        eq(donationTransactionsTable.method, "qris"),
      ),
    );

  const pendingRows = await db
    .select({
      id: donationTransactionsTable.id,
      referenceNumber: donationTransactionsTable.referenceNumber,
      amount: donationTransactionsTable.amount,
      grossAmount: donationTransactionsTable.grossAmount,
      createdAt: donationTransactionsTable.createdAt,
    })
    .from(donationTransactionsTable)
    .where(
      and(
        eq(donationTransactionsTable.status, "pending"),
        eq(donationTransactionsTable.method, "qris"),
        gte(donationTransactionsTable.createdAt, new Date(Date.now() - 48 * 60 * 60 * 1000)),
      ),
    )
    .orderBy(asc(donationTransactionsTable.createdAt))
    .limit(200);

  const donations: PendingDonation[] = pendingRows.map((row) => ({
    id: row.id,
    referenceNumber: row.referenceNumber,
    amount: row.amount,
    grossAmount: row.grossAmount ?? row.amount,
    createdAt: row.createdAt,
  }));

  const result = matchDonationsToFeed(donations, paidEntries, { now: new Date() });

  const verifiedAt = new Date();
  for (const match of result.matches) {
    await db
      .update(donationTransactionsTable)
      .set({
        status: "verified",
        autoVerified: true,
        verifiedAt,
        verifiedBy: options.actor || "auto-verifikasi-qris",
        adminNote: `Terverifikasi otomatis dari mutasi GoPay${
          match.entry.orderId ? ` (order ${match.entry.orderId})` : ""
        }.`,
        updatedAt: verifiedAt,
      })
      .where(eq(donationTransactionsTable.id, match.donation.id));
  }

  const pendingAfter = await db
    .select({ id: donationTransactionsTable.id })
    .from(donationTransactionsTable)
    .where(
      and(
        eq(donationTransactionsTable.status, "pending"),
        eq(donationTransactionsTable.method, "qris"),
      ),
    );

  await upsertGopayAccount({ lastCheckedAt: new Date(), updatedAt: new Date() });

  return {
    status: "ok",
    message:
      result.matches.length > 0
        ? `${result.matches.length} donasi terverifikasi otomatis.`
        : "Tidak ada mutasi baru yang cocok.",
    feedCount: paidEntries.length,
    matchedCount: result.matches.length,
    pendingBefore: pendingBefore.length,
    pendingAfter: pendingAfter.length,
    matches: result.matches.map((match) => ({
      transactionId: match.donation.id,
      referenceNumber: match.donation.referenceNumber,
      amount: match.donation.amount,
      grossAmount: match.donation.grossAmount,
      orderId: match.entry.orderId,
      paidAt: match.entry.transactionTime.toISOString(),
    })),
    ambiguous: result.ambiguous.map((item) => ({
      transactionId: item.donation.id,
      referenceNumber: item.donation.referenceNumber,
      grossAmount: item.donation.grossAmount,
      candidateCount: item.candidates.length,
    })),
  };
}

export type { StoredGopaySession };

// ---------------------------------------------------------------------------
// Riwayat pemeriksaan
// ---------------------------------------------------------------------------

/**
 * Simpan catatan satu kali pemeriksaan mutasi.
 * Dipakai panel admin untuk melihat auto-verifikasi hidup atau mati.
 */
export async function recordVerificationRun(
  source: "manual" | "auto",
  result: VerificationRunResult,
): Promise<void> {
  try {
    await db.insert(donationVerificationRunsTable).values({
      source,
      status: result.status,
      message: result.message || null,
      feedCount: result.feedCount,
      matchedCount: result.matchedCount,
      pendingBefore: result.pendingBefore,
      pendingAfter: result.pendingAfter,
      details: {
        matches: result.matches,
        ambiguous: result.ambiguous,
      },
      finishedAt: new Date(),
    });
  } catch (error) {
    console.error("Gagal menyimpan riwayat verifikasi donasi:", error);
  }
}

/**
 * Jalankan verifikasi + catat riwayatnya.
 * Dipakai oleh tombol panel admin (manual) maupun pemicu cron/worker (auto).
 */
export async function executeVerification(
  options: VerificationRunOptions,
): Promise<VerificationRunResult> {
  const result = await runQrissVerification(options);
  await recordVerificationRun(options.source, result);
  return result;
}

/** Ambil riwayat pemeriksaan terakhir. */
export async function listVerificationRuns(limit = 20) {
  return db
    .select()
    .from(donationVerificationRunsTable)
    .orderBy(desc(donationVerificationRunsTable.createdAt))
    .limit(Math.min(100, Math.max(1, limit)));
}

