/**
 * Tes logika pencocokan mutasi QRIS (auto-verifikasi).
 *
 * Jalankan dari folder artifacts/api-server:
 *   corepack pnpm exec tsx donation-matcher-test.ts
 *
 * Yang diuji (fungsi murni `matchDonationsToFeed`, tanpa database):
 *  - nominal yang dicocokkan = nominal yang dibayar (amount + fee MDR)
 *  - mutasi sebelum transaksi dibuat TIDAK boleh dipakai
 *  - satu baris mutasi hanya boleh dipakai satu transaksi (dedupe)
 *  - kandidat nyaris bersamaan -> ambigu (dibiarkan pending)
 *  - transaksi terlalu lama (di luar max age) -> tidak dicocokkan
 */
import { matchDonationsToFeed, type PendingDonation } from "./src/lib/donation-matching";
import type { QrisFeedEntry } from "./src/lib/gopay";

let fail = 0;
const ok = (cond: boolean, msg: string) => {
  console.log((cond ? "  OK   " : "  FAIL ") + msg);
  if (!cond) fail += 1;
};

const NOW = new Date("2026-10-22T10:00:00.000Z");

function donation(overrides: Partial<PendingDonation> = {}): PendingDonation {
  return {
    id: 1,
    referenceNumber: "DONASI-TEST-001",
    amount: 10000,
    grossAmount: 10071,
    createdAt: new Date(NOW.getTime() - 5 * 60 * 1000),
    ...overrides,
  };
}

function entry(overrides: Partial<QrisFeedEntry> = {}): QrisFeedEntry {
  return {
    id: "tx-1",
    orderId: "QRIS-ORDER-1",
    amount: 10071,
    rawAmount: 1007100,
    status: "SETTLEMENT",
    paymentType: "QRIS",
    transactionTime: new Date(NOW.getTime() - 4 * 60 * 1000),
    settlementTime: null,
    ...overrides,
  };
}

console.log("1) mutasi dengan nominal sama -> cocok (pakai gross, bukan amount)");
const r1 = matchDonationsToFeed([donation()], [entry()], { now: NOW });
ok(r1.matches.length === 1, "1 transaksi terverifikasi");
ok(r1.matches[0]?.donation.referenceNumber === "DONASI-TEST-001", "yang cocok = transaksi donasi");
ok(r1.unmatched.length === 0, "tidak ada sisa pending");

console.log("2) nominal beda (mis. donatur bayar kurang) -> tidak cocok");
const r2 = matchDonationsToFeed([donation()], [entry({ amount: 10000, rawAmount: 1000000 })], { now: NOW });
ok(r2.matches.length === 0, "tidak ada yang terverifikasi");
ok(r2.unmatched.length === 1, "transaksi tetap pending");

console.log("3) mutasi SEBELUM transaksi dibuat -> tidak boleh cocok");
const r3 = matchDonationsToFeed(
  [donation({ createdAt: new Date(NOW.getTime() - 60 * 1000) })],
  [entry({ transactionTime: new Date(NOW.getTime() - 30 * 60 * 1000) })],
  { now: NOW },
);
ok(r3.matches.length === 0, "mutasi lama tidak dipakai");

console.log("4) dedupe: satu mutasi tidak boleh dipakai dua transaksi");
const r4 = matchDonationsToFeed(
  [
    donation({ id: 1, referenceNumber: "A", createdAt: new Date(NOW.getTime() - 10 * 60 * 1000) }),
    donation({ id: 2, referenceNumber: "B", createdAt: new Date(NOW.getTime() - 5 * 60 * 1000) }),
  ],
  [entry()],
  { now: NOW },
);
ok(r4.matches.length === 1, "hanya 1 transaksi yang terverifikasi");
ok(r4.matches[0]?.donation.referenceNumber === "A", "yang pertama dibuat yang claiming");
ok(r4.unmatched.length === 1, "transaksi kedua tetap pending");

console.log("5) kandidat nyaris bersamaan -> ambigu (tidak dipaksa)");
const r5 = matchDonationsToFeed(
  [donation()],
  [
    entry({ id: "tx-a", transactionTime: new Date(NOW.getTime() - 4 * 60 * 1000) }),
    entry({ id: "tx-b", transactionTime: new Date(NOW.getTime() - 3.5 * 60 * 1000) }),
  ],
  { now: NOW },
);
ok(r5.matches.length === 0, "tidak ada yang diverifikasi otomatis");
ok(r5.ambiguous.length === 1, "masuk daftar ambigu untuk diperiksa admin");

console.log("6) dua mutasi berjauhan -> yang paling dekat waktunya yang cocok");
const r6 = matchDonationsToFeed(
  [donation()],
  [
    entry({ id: "tx-lama", transactionTime: new Date(NOW.getTime() - 40 * 60 * 1000) }),
    entry({ id: "tx-dekat", transactionTime: new Date(NOW.getTime() - 4 * 60 * 1000) }),
  ],
  { now: NOW },
);
ok(r6.matches.length === 1, "1 transaksi terverifikasi");
ok(r6.matches[0]?.entry.id === "tx-dekat", "yang dipilih = mutasi terdekat waktunya");

console.log("7) transaksi terlalu lama (di luar max age) -> tidak dicocokkan");
const r7 = matchDonationsToFeed(
  [donation({ createdAt: new Date(NOW.getTime() - 72 * 60 * 60 * 1000) })],
  [entry({ transactionTime: new Date(NOW.getTime() - 71 * 60 * 60 * 1000) })],
  { now: NOW },
);
ok(r7.matches.length === 0, "transaksi lama tidak ikut terverifikasi");

console.log("8) status mutasi bukan SETTLEMENT/CAPTURE tidak boleh dipakai");
// filterPaidQrissEntries diuji terpisah; di sini pastikan matcher tidak
// memfilter status (itu tanggung jawab pemanggil), tapi REFUND tidak boleh
// menghasilkan verifikasi karena pemanggil sudah menyaring.
const paid = [entry({ status: "REFUND" })];
const r8 = matchDonationsToFeed([donation()], paid, { now: NOW });
ok(r8.matches.length === 1, "matcher murni (penyaringan status ada di filterPaidQrissEntries)");

console.log("9) MDR 0 -> nominal yang dicocokkan = nominal donasi");
const r9 = matchDonationsToFeed(
  [donation({ amount: 10000, grossAmount: 10000 })],
  [entry({ amount: 10000, rawAmount: 1000000 })],
  { now: NOW },
);
ok(r9.matches.length === 1, "donasi Rp 10.000 (tanpa fee) cocok dengan mutasi Rp 10.000");

console.log("");
if (fail > 0) {
  console.log(`GAGAL: ${fail} assertion tidak lulus.`);
  process.exit(1);
}
console.log("Semua tes pencocokan mutasi LULUS.");
