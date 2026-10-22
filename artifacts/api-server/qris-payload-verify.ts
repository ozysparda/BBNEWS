/**
 * Verifikasi payload QRIS: CRC16, penempatan tag 54, dan byte lain tetap utuh.
 * Jalankan: corepack pnpm exec tsx qris-payload-verify.ts
 */
import { crc16Ccitt, buildDynamicQris, readQrisAmount, inspectQrisPayload } from "./src/lib/qris";

const STATIC =
  "00020101021126610014COM.GO-JEK.WWW01189360091431984093930210G1984093930303UMI51440014ID.CO.QRIS.WWW0215ID10266221859770303UMI5204573253033605802ID5925AKHMAD FAROYZI HENDRA SAP6013LOMBOK TENGAH61058357362070703A0163049000";

let fail = 0;
const ok = (cond: boolean, msg: string) => {
  console.log((cond ? "  OK   " : "  FAIL ") + msg);
  if (!cond) fail += 1;
};

/** Parse payload QRIS jadi daftar tag {tag, value}. */
function parseTags(payload: string) {
  const tags: Array<{ tag: string; value: string; offset: number }> = [];
  let i = 0;
  while (i < payload.length - 3) {
    const tag = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    tags.push({ tag, value: payload.slice(i + 4, i + 4 + len), offset: i });
    i += 4 + len;
  }
  return tags;
}

console.log("1) CRC16-CCITT-FALSE fungsi benar (payload statis resmi -> 9000)");
const staticBody = STATIC.slice(0, -4);
const staticCrc = crc16Ccitt(staticBody);
ok(
  staticCrc.toString(16).toUpperCase().padStart(4, "0") === "9000",
  `CRC payload statis = ${staticCrc.toString(16).toUpperCase().padStart(4, "0")} (harus 9000)`,
);

console.log("2) Payload dinamis: CRC valid & tag 54 berisi nominal");
for (const amount of [10000, 10071, 50000, 125000]) {
  const dyn = buildDynamicQris(STATIC, amount)!;
  const body = dyn.slice(0, -4);
  const crc = dyn.slice(-4).toUpperCase();
  const calc = crc16Ccitt(body).toString(16).toUpperCase().padStart(4, "0");
  ok(crc === calc, `nominal ${amount}: CRC payload = ${crc}, hitung = ${calc}`);
  ok(readQrisAmount(dyn) === amount, `nominal ${amount}: readQrisAmount = ${readQrisAmount(dyn)}`);
}

console.log("3) Tag 54 disisipkan setelah tag 53, sebelum tag 58");
const dyn = buildDynamicQris(STATIC, 10071)!;
const tags = parseTags(dyn);
const order = tags.map((t) => t.tag);
const i54 = order.indexOf("54");
const i53 = order.indexOf("53");
const i58 = order.indexOf("58");
ok(i53 < i54 && i54 < i58, `urutan tag: ...${order.slice(Math.max(0, i53 - 1), i58 + 2).join(",")}...`);
ok(tags[i54].value === "10071", `nilai tag 54 = ${tags[i54].value}`);

console.log("4) Tag lain identik dengan payload statis (merchant id/nama/kota utuh)");
const staticTags = parseTags(STATIC);
for (const t of staticTags) {
  if (t.tag === "54" || t.tag === "63") continue;
  const match = tags.find((x) => x.tag === t.tag && x.value === t.value);
  ok(!!match, `tag ${t.tag} (${t.value.length} char) tidak berubah`);
}
ok(tags.length === staticTags.length + 1, `jumlah tag ${staticTags.length} -> ${tags.length} (+1 tag 54)`);

console.log("5) inspectQrisPayload masih membaca merchant dengan benar");
const info = inspectQrisPayload(dyn);
const infoStatic = inspectQrisPayload(STATIC);
console.log("   ", JSON.stringify(info));
ok(info.merchantName === infoStatic.merchantName, "nama merchant sama dengan payload statis");
ok(info.merchantId === infoStatic.merchantId, "merchant id sama dengan payload statis");
ok(info.amount === 10071, "amount terbaca = 10071");
ok(infoStatic.amount === null, "payload statis tidak punya tag 54 (amount = null)");

console.log(fail === 0 ? "\n=== SEMUA TEST LULUS ===" : `\n=== ${fail} TEST GAGAL ===`);
process.exit(fail === 0 ? 0 : 1);
