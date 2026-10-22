/**
 * Pencocokan mutasi QRIS dengan transaksi donasi yang masih "pending".
 *
 * File ini SENGAJA tidak meng-import database supaya logikanya bisa diuji
 * tanpa koneksi DB (lihat `donation-matcher-test.ts`).
 *
 * ATURAN PENCOCOKAN
 * -----------------
 * 1. Nominal yang dicocokkan adalah nominal yang DIBAYAR donatur
 *    (`gross_amount` = amount + fee MDR), bukan nominal bersih donasi.
 *    Jadi donasi Rp 10.000 dengan MDR 0,7% dicocokkan dengan mutasi Rp 10.071.
 * 2. Pembayaran harus terjadi SETELAH transaksi donasi dibuat (dengan
 *    toleransi selisih jam) supaya mutasi lama tidak ikut terverifikasi.
 * 3. Satu baris mutasi hanya boleh dipakai untuk SATU transaksi donasi
 *    (dedupe by id mutasi).
 * 4. Kalau ada lebih dari satu kandidat yang sama-sama "dekat" waktunya,
 *    hasilnya dianggap AMBIGU -> dibiarkan pending untuk diperiksa admin
 *    (lebih aman daripada salah verifikasi).
 */

import type { QrisFeedEntry } from "./gopay";

/** Transaksi donasi yang menunggu verifikasi. */
export interface PendingDonation {
  id: number;
  referenceNumber: string;
  /** Nominal bersih donasi (yang dihitung ke total campaign). */
  amount: number;
  /** Nominal yang dibayar donatur (amount + fee). */
  grossAmount: number;
  createdAt: Date;
}

export interface MatchOptions {
  /** Waktu "sekarang" (bikin deterministik untuk tes). */
  now: Date;
  /** Toleransi donatur membayar SEBELUM transaksi dibuat (ms). Default 5 menit. */
  clockSkewMs?: number;
  /** Umur maksimum transaksi donasi yang masih dicocokkan (ms). Default 48 jam. */
  maxDonationAgeMs?: number;
  /** Kalau dua kandidat bedanya <= ini (ms), dianggap ambigu. Default 2 menit. */
  ambiguityMs?: number;
}

export interface DonationMatch {
  donation: PendingDonation;
  entry: QrisFeedEntry;
  /** Selisih waktu (ms) antara pembuatan transaksi dan pembayaran. */
  timeDeltaMs: number;
}

export interface AmbiguousDonation {
  donation: PendingDonation;
  candidates: QrisFeedEntry[];
}

export interface MatchResult {
  matches: DonationMatch[];
  ambiguous: AmbiguousDonation[];
  unmatched: PendingDonation[];
}

export const DEFAULT_CLOCK_SKEW_MS = 5 * 60 * 1000;
export const DEFAULT_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const DEFAULT_AMBIGUITY_MS = 2 * 60 * 1000;

/**
 * Cocokkan transaksi pending dengan baris mutasi QRIS.
 *
 * Murni - tidak ada akses database di sini.
 */
export function matchDonationsToFeed(
  donations: PendingDonation[],
  entries: QrisFeedEntry[],
  options: MatchOptions,
): MatchResult {
  const clockSkewMs = options.clockSkewMs ?? DEFAULT_CLOCK_SKEW_MS;
  const maxDonationAgeMs = options.maxDonationAgeMs ?? DEFAULT_MAX_AGE_MS;
  const ambiguityMs = options.ambiguityMs ?? DEFAULT_AMBIGUITY_MS;
  const now = options.now.getTime();

  const usedEntryIds = new Set<string>();
  const matches: DonationMatch[] = [];
  const ambiguous: AmbiguousDonation[] = [];
  const unmatched: PendingDonation[] = [];

  const sortedDonations = [...donations].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  for (const donation of sortedDonations) {
    const createdMs = donation.createdAt.getTime();
    const targetAmount = donation.grossAmount > 0 ? donation.grossAmount : donation.amount;

    // Terlalu lama -> biarkan (biasanya sudah diperiksa manual).
    if (now - createdMs > maxDonationAgeMs) {
      unmatched.push(donation);
      continue;
    }

    const candidates = entries
      .filter((entry) => !usedEntryIds.has(entry.id))
      .filter((entry) => entry.amount === targetAmount)
      .filter((entry) => {
        const paidMs = entry.transactionTime.getTime();
        return paidMs >= createdMs - clockSkewMs && paidMs <= now + clockSkewMs;
      })
      .sort(
        (a, b) =>
          Math.abs(a.transactionTime.getTime() - createdMs) -
          Math.abs(b.transactionTime.getTime() - createdMs),
      );

    if (candidates.length === 0) {
      unmatched.push(donation);
      continue;
    }

    const best = candidates[0];
    const second = candidates[1];
    if (
      second &&
      Math.abs(second.transactionTime.getTime() - best.transactionTime.getTime()) <= ambiguityMs
    ) {
      // Dua pembayaran (atau lebih) nyaris bersamaan dengan nominal sama:
      // tidak bisa dipastikan -> biarkan untuk admin.
      ambiguous.push({ donation, candidates });
      continue;
    }

    usedEntryIds.add(best.id);
    matches.push({
      donation,
      entry: best,
      timeDeltaMs: best.transactionTime.getTime() - createdMs,
    });
  }

  return { matches, ambiguous, unmatched };
}
