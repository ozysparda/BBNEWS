/**
 * Tes logika QRIS dinamis + biaya MDR (gross-up).
 *
 * Jalankan dari folder artifacts/api-server:
 *   corepack pnpm exec tsx qris-fee-test.ts
 *
 * Yang diuji:
 *  - buildDynamicQris: nominal masuk ke tag 54, CRC valid, merchant id tetap
 *  - computeQrisCharge: gross-up MDR, merchant tidak pernah rugi untuk semua
 *    mode pembulatan MDR (floor / round / ceil)
 */
import { computeQrisCharge, buildDynamicQris, readQrisAmount } from "./src/lib/qris";

const STATIC =
  "00020101021126610014COM.GO-JEK.WWW01189360091431984093930210G1984093930303UMI51440014ID.CO.QRIS.WWW0215ID10266221859770303UMI5204573253033605802ID5925AKHMAD FAROYZI HENDRA SAP6013LOMBOK TENGAH61058357362070703A0163049000";

let fail = 0;
const ok = (cond: boolean, msg: string) => {
  console.log((cond ? "  OK   " : "  FAIL ") + msg);
  if (!cond) fail += 1;
};

console.log("1) MDR 0% (kategori Donasi) -> tidak ada biaya tambahan");
const zero = computeQrisCharge(10000, 0);
ok(zero.grossAmount === 10000 && zero.feeAmount === 0, JSON.stringify(zero));

console.log("2) MDR 0,7% (70 bps)");
const r1 = computeQrisCharge(10000, 70);
ok(r1.grossAmount === 10071, "gross 10.071, dapat " + r1.grossAmount);
ok(r1.feeAmount === 71, "fee 71, dapat " + r1.feeAmount);
ok(r1.grossAmount === r1.feeAmount + 10000, "donasi + fee = yang dibayar");

console.log("3) merchant TIDAK boleh rugi, untuk semua mode pembulatan MDR");
for (const rate of [0.003, 0.007, 0.01]) {
  for (const net of [1000, 10000, 12345, 50000, 100000, 1234567, 25000000]) {
    const bps = Math.round(rate * 10000);
    const r = computeQrisCharge(net, bps);
    const mdr = r.grossAmount * rate;
    for (const [mode, dipotong] of [
      ["floor", Math.floor(mdr)],
      ["round", Math.round(mdr)],
      ["ceil", Math.ceil(mdr)],
    ] as const) {
      const bersih = r.grossAmount - dipotong;
      ok(
        bersih >= net,
        `rate ${rate} net ${net} (${mode}) -> bayar ${r.grossAmount}, MDR ${dipotong}, bersih ${bersih}`,
      );
    }
  }
}

console.log("4) MDR 0,3% (30 bps) & 1% (100 bps)");
ok(computeQrisCharge(10000, 30).grossAmount === 10031, "0,3% -> 10.031");
ok(computeQrisCharge(10000, 100).grossAmount === 10102, "1% -> 10.102");

console.log("5) input tidak valid");
ok(computeQrisCharge(0, 70).grossAmount === 0, "nominal 0");
ok(computeQrisCharge(-1, 70).grossAmount === 0, "nominal negatif");
ok(computeQrisCharge(10000, -5).feeAmount === 0, "bps negatif di-clamp ke 0");
ok(
  computeQrisCharge(10000, 99999).grossAmount === computeQrisCharge(10000, 1000).grossAmount,
  "bps di-clamp maks 10%",
);

console.log("6) QRIS memakai nominal yang harus dibayar (gross)");
const qr = buildDynamicQris(STATIC, computeQrisCharge(10000, 70).grossAmount)!;
ok(readQrisAmount(qr) === 10071, "nominal di QR = 10.071, dapat " + readQrisAmount(qr));

console.log(fail === 0 ? "\n=== SEMUA TEST LULUS ===" : "\n=== " + fail + " TEST GAGAL ===");
process.exit(fail === 0 ? 0 : 1);
