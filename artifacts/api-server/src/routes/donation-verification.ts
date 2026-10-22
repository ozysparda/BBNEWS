/**
 * Auto-verifikasi donasi QRIS - dua opsi:
 *
 *   OPSI 1 (MANUAL)  : tombol "Cek Mutasi Sekarang" di panel admin.
 *                      Admin klik -> server tarik mutasi GoPay -> cocokkan ->
 *                      transaksi pending jadi verified.
 *
 *   OPSI 2 (OTOMATIS): pemicu eksternal (GitHub Actions cron / worker di host
 *                      gratis) memanggil endpoint internal berkala. Endpoint
 *                      yang sama, bedanya sumber pemicu & toggle auto.
 *
 * Kredensial GoPay (token sesi) disimpan terenkripsi di database, jadi
 * TIDAK ada secret yang harus ditaruh di repo maupun di mesin cron.
 */

import { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { db } from "@workspace/db";
import { donationTransactionsTable } from "@workspace/db/schema";
import { count, eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { GopayError, fetchProfile, loginWithOtp, requestLoginOtp } from "../lib/gopay";
import {
  clearGopaySession,
  clearOtpToken,
  getGopayAccount,
  loadGopaySession,
  loadOtpToken,
  saveGopaySession,
  saveOtpToken,
  upsertGopayAccount,
} from "../lib/gopay-session";
import {
  executeVerification,
  listVerificationRuns,
  type VerificationRunResult,
} from "../lib/donation-matcher";

const router = Router();

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a || ""));
  const bufB = Buffer.from(String(b || ""));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Bentuk respons hasil verifikasi (dipakai bersama oleh manual & internal). */
function formatRunResult(result: VerificationRunResult) {
  return {
    status: result.status,
    message: result.message,
    feedCount: result.feedCount,
    matchedCount: result.matchedCount,
    pendingBefore: result.pendingBefore,
    pendingAfter: result.pendingAfter,
    matches: result.matches,
    ambiguous: result.ambiguous,
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

/**
 * Status integrasi auto-verifikasi QRIS.
 * Dipakai panel admin untuk menampilkan: sudah terhubung? auto aktif?
 * kapan terakhir dicek? ada berapa transaksi pending?
 */
router.get("/admin/donations/verify/status", requireAuth, async (_req: AuthRequest, res) => {
  try {
    const account = await getGopayAccount();
    const session = await loadGopaySession();
    const [pending] = await db
      .select({ value: count() })
      .from(donationTransactionsTable)
      .where(eq(donationTransactionsTable.status, "pending"));

    res.json({
      connected: Boolean(session),
      phoneNumber: account?.phoneNumber ?? null,
      merchantId: session?.merchantId ?? account?.merchantId ?? null,
      sessionUpdatedAt: toIso(account?.sessionUpdatedAt),
      lastCheckedAt: toIso(account?.lastCheckedAt),
      autoVerifyEnabled: account?.autoVerifyEnabled === true,
      autoVerifyWindowMinutes: account?.autoVerifyWindowMinutes ?? 60,
      pendingCount: pending?.value ?? 0,
    });
  } catch (error) {
    console.error("Error fetching donation verification status:", error);
    res.status(500).json({ error: "Gagal memuat status verifikasi donasi" });
  }
});

/** Minta kode OTP SMS ke nomor HP akun GoPay Merchant. */
router.post("/admin/donations/verify/otp", requireAuth, async (req: AuthRequest, res) => {
  try {
    const phoneNumber = String(req.body?.phoneNumber || "").trim();
    if (!phoneNumber) {
      res.status(400).json({ error: "Nomor HP akun GoPay Merchant wajib diisi" });
      return;
    }
    const otp = await requestLoginOtp(phoneNumber);
    const expiresAt = new Date(Date.now() + otp.expiresInSeconds * 1000);
    await saveOtpToken(otp.otpToken, expiresAt);
    await upsertGopayAccount({ phoneNumber, updatedAt: new Date() });

    res.json({
      ok: true,
      message: `Kode OTP dikirim ke ${phoneNumber}. Berlaku ${Math.round(otp.expiresInSeconds / 60)} menit.`,
      otpLength: otp.otpLength,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Error requesting GoPay OTP:", error);
    const status = error instanceof GopayError ? error.status || 400 : 400;
    res.status(status).json({ error: error?.message || "Gagal meminta kode OTP" });
  }
});

/** Tukar kode OTP dengan sesi GoPay (disimpan terenkripsi di database). */
router.post("/admin/donations/verify/login", requireAuth, async (req: AuthRequest, res) => {
  try {
    const otp = String(req.body?.otp || "").trim();
    if (!otp) {
      res.status(400).json({ error: "Kode OTP wajib diisi" });
      return;
    }
    const pending = await loadOtpToken();
    if (!pending) {
      res.status(400).json({ error: "Kode OTP sudah kadaluarsa. Minta kode baru." });
      return;
    }

    const session = await loginWithOtp(otp, pending.otpToken);
    await clearOtpToken();

    const account = await getGopayAccount();
    let merchantId: string | null = account?.merchantId ?? null;
    let merchantName: string | null = null;
    try {
      const profile = await fetchProfile(session.accessToken);
      merchantId = profile.merchantId ?? merchantId;
      merchantName = profile.merchantName;
    } catch {
      // Merchant id boleh diambil ulang nanti saat verifikasi berjalan.
    }

    await saveGopaySession({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      merchantId,
      phoneNumber: account?.phoneNumber ?? null,
      savedAt: new Date().toISOString(),
    });

    res.json({
      ok: true,
      message: "Berhasil terhubung ke akun GoPay Merchant.",
      merchantId,
      merchantName,
    });
  } catch (error: any) {
    console.error("Error logging into GoPay merchant:", error);
    const status = error instanceof GopayError ? error.status || 400 : 400;
    res.status(status).json({ error: error?.message || "Gagal login ke GoPay Merchant" });
  }
});

/** Putuskan sesi GoPay (logout). */
router.post("/admin/donations/verify/logout", requireAuth, async (_req: AuthRequest, res) => {
  try {
    await clearGopaySession();
    res.json({ ok: true, message: "Sesi GoPay Merchant diputus." });
  } catch (error) {
    console.error("Error clearing GoPay session:", error);
    res.status(500).json({ error: "Gagal memutus sesi GoPay Merchant" });
  }
});

/**
 * OPSI 1 - verifikasi manual: tarik mutasi sekarang & cocokkan.
 */
router.post("/admin/donations/verify/run", requireAuth, async (req: AuthRequest, res) => {
  try {
    const windowMinutes = Math.max(
      5,
      Math.min(Number(req.body?.windowMinutes) || 60, 7 * 24 * 60),
    );
    const result = await executeVerification({
      source: "manual",
      windowMinutes,
      actor: req.adminUsername ?? "admin",
    });
    res.json(formatRunResult(result));
  } catch (error) {
    console.error("Error running donation verification:", error);
    res.status(500).json({ error: "Gagal menjalankan verifikasi mutasi" });
  }
});

/** Riwayat pemeriksaan mutasi terakhir. */
router.get("/admin/donations/verify/runs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const rows = await listVerificationRuns(limit);
    res.json(
      rows.map((row) => ({
        id: row.id,
        source: row.source,
        status: row.status,
        message: row.message,
        feedCount: row.feedCount,
        matchedCount: row.matchedCount,
        pendingBefore: row.pendingBefore,
        pendingAfter: row.pendingAfter,
        details: row.details,
        startedAt: toIso(row.startedAt),
        finishedAt: toIso(row.finishedAt),
        createdAt: toIso(row.createdAt),
      })),
    );
  } catch (error) {
    console.error("Error fetching donation verification runs:", error);
    res.status(500).json({ error: "Gagal memuat riwayat verifikasi donasi" });
  }
});

/** Setelan auto-verifikasi (nyala/mati + rentang waktu feed). */
router.put("/admin/donations/verify/settings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body || {};
    const account = await getGopayAccount();
    const autoVerifyEnabled =
      body.autoVerifyEnabled === undefined
        ? account?.autoVerifyEnabled === true
        : body.autoVerifyEnabled === true || body.autoVerifyEnabled === "true";
    const autoVerifyWindowMinutes =
      body.autoVerifyWindowMinutes === undefined
        ? (account?.autoVerifyWindowMinutes ?? 60)
        : Math.max(5, Math.min(Math.round(Number(body.autoVerifyWindowMinutes) || 60), 7 * 24 * 60));

    const row = await upsertGopayAccount({ autoVerifyEnabled, autoVerifyWindowMinutes, updatedAt: new Date() });
    res.json({
      autoVerifyEnabled: row.autoVerifyEnabled,
      autoVerifyWindowMinutes: row.autoVerifyWindowMinutes,
    });
  } catch (error) {
    console.error("Error updating donation verification settings:", error);
    res.status(500).json({ error: "Gagal menyimpan setelan verifikasi donasi" });
  }
});

// ---------------------------------------------------------------------------
// Internal (pemicu otomatis)
// ---------------------------------------------------------------------------

/**
 * OPSI 2 - endpoint internal untuk pemicu otomatis (cron / worker).
 *
 * Autentikasi: header `x-cron-secret` harus sama dengan env `CRON_SECRET`.
 * Kalau auto-verifikasi dimatikan di panel admin, endpoint ini hanya
 * melaporkan "skipped" tanpa menyentuh data.
 */
router.post("/internal/donations/verify/run", async (req, res) => {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      res.status(404).json({ error: "Verifikasi otomatis tidak aktif" });
      return;
    }
    const provided = String(req.headers["x-cron-secret"] || "");
    if (!safeEqual(provided, secret)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const account = await getGopayAccount();
    if (!account?.autoVerifyEnabled) {
      res.json({
        status: "skipped",
        message: "Auto-verifikasi dimatikan di panel admin.",
        feedCount: 0,
        matchedCount: 0,
        pendingBefore: 0,
        pendingAfter: 0,
        matches: [],
        ambiguous: [],
      });
      return;
    }

    const result = await executeVerification({
      source: "auto",
      windowMinutes: account.autoVerifyWindowMinutes ?? 60,
    });
    res.json(formatRunResult(result));
  } catch (error) {
    console.error("Error running automatic donation verification:", error);
    res.status(500).json({ error: "Gagal menjalankan verifikasi otomatis" });
  }
});

export default router;
