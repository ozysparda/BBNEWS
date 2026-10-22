#!/usr/bin/env node
/**
 * Worker auto-verifikasi donasi QRIS (Opsi 2 - host 24/7, gratis).
 *
 * Worker ini SANGAT Sederhana: hanya "ticker" yang memanggil endpoint internal
 * BBNEWS secara berkala. Semua logika (baca mutasi GoPay, pencocokan, update
 * database) berada di server aplikasi, jadi:
 *
 *   - worker TIDAK butuh akses database,
 *   - worker TIDAK butuh kredensial GoPay Merchant,
 *   - worker hanya butuh satu secret: CRON_SECRET.
 *
 * Cocok untuk Oracle Cloud Always Free (2 VM gratis) atau laptop yang nyala
 * terus. Kalau tidak punya host, pakai GitHub Actions cron
 * (`.github/workflows/donation-verify.yml`) - gratis juga.
 *
 * CARA PAKAI
 * ----------
 *   export CRON_SECRET="..."                 # sama dengan env di Vercel
 *   export VERIFY_URL="https://berugaknews.com/api/internal/donations/verify/run"
 *   node scripts/donation-verify-worker.mjs
 *
 * Opsi environment:
 *   VERIFY_INTERVAL_SECONDS  jeda antar panggilan (default 10)
 *   VERIFY_URL               endpoint internal (default production BBNEWS)
 *   CRON_SECRET              secret endpoint (wajib)
 *
 * Secret TIDAK pernah disimpan di repo - selalu lewat environment variable.
 */

const INTERVAL_SECONDS = Math.max(
  5,
  Number(process.env.VERIFY_INTERVAL_SECONDS || 10),
);
const VERIFY_URL =
  process.env.VERIFY_URL ||
  "https://berugaknews.com/api/internal/donations/verify/run";
const CRON_SECRET = process.env.CRON_SECRET || "";

let running = false;

function log(message) {
  const stamp = new Date().toISOString();
  console.log(`[${stamp}] ${message}`);
}

async function tick() {
  if (running) {
    log("Pemeriksaan sebelumnya masih jalan, dilewati.");
    return;
  }
  running = true;
  try {
    if (!CRON_SECRET) {
      log("ERROR: env CRON_SECRET belum diset. Worker berhenti.");
      process.exitCode = 1;
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      const res = await fetch(VERIFY_URL, {
        method: "POST",
        headers: {
          "x-cron-secret": CRON_SECRET,
          accept: "application/json",
        },
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        log(`HTTP ${res.status}: ${text.slice(0, 300)}`);
        return;
      }
      let summary = text;
      try {
        const data = JSON.parse(text);
        summary = `status=${data.status} terverifikasi=${data.matchedCount} pending=${data.pendingAfter}${
          data.message ? ` - ${data.message}` : ""
        }`;
      } catch {
        summary = text.slice(0, 200);
      }
      log(summary);
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    log(`Gagal memanggil endpoint: ${error?.message || error}`);
  } finally {
    running = false;
  }
}

log(`Worker auto-verifikasi donasi aktif. Interval ${INTERVAL_SECONDS} detik.`);
log(`Endpoint: ${VERIFY_URL}`);

await tick();
setInterval(() => {
  void tick();
}, INTERVAL_SECONDS * 1000);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    log("Worker dihentikan.");
    process.exit(0);
  });
}
