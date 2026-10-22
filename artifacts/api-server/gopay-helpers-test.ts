/**
 * Tes helper klien GoPay Merchant (tidak butuh database / jaringan).
 *
 * Jalankan dari folder artifacts/api-server:
 *   corepack pnpm exec tsx gopay-helpers-test.ts
 *
 * Yang diuji:
 *  - toRupiah: konversi satuan kecil (sen) -> rupiah + fallback aman
 *  - normalizePhoneNumber: format 62xxx / 0xxx / +62xxx -> format portal
 */
import { normalizePhoneNumber, toRupiah } from "./src/lib/gopay";

let fail = 0;
const ok = (cond: boolean, msg: string) => {
  console.log((cond ? "  OK   " : "  FAIL ") + msg);
  if (!cond) fail += 1;
};

console.log("1) toRupiah - satuan kecil (sen) -> rupiah");
ok(toRupiah(1007100) === 10071, "1.007.100 sen = Rp 10.071");
ok(toRupiah(1000000) === 10000, "1.000.000 sen = Rp 10.000");
ok(toRupiah(5000000) === 50000, "5.000.000 sen = Rp 50.000");

console.log("2) toRupiah - fallback kalau angka tidak kelipatan 100");
ok(toRupiah(10071) === 10071, "10.071 (bukan sen) tetap Rp 10.071");
ok(toRupiah(0) === 0, "0 -> 0");

console.log("3) normalizePhoneNumber");
ok(normalizePhoneNumber("081234567890") === "81234567890", "awalan 0 dibuang");
ok(normalizePhoneNumber("+6281234567890") === "81234567890", "format +62 -> 8123...");
ok(normalizePhoneNumber("62 812-3456-7890") === "81234567890", "spasi & strip -> bersih");
ok(normalizePhoneNumber("81234567890") === "81234567890", "format lokal tetap");

console.log("4) normalizePhoneNumber - nomor tidak valid ditolak");
let ditolak = false;
try {
  normalizePhoneNumber("12");
} catch {
  ditolak = true;
}
ok(ditolak, "nomor terlalu pendek ditolak");

console.log("");
if (fail > 0) {
  console.log(`GAGAL: ${fail} assertion tidak lulus.`);
  process.exit(1);
}
console.log("Semua tes helper GoPay LULUS.");
