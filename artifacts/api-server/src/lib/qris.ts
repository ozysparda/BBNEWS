/**
 * QRIS Dinamis (EMVCo) - mengubah payload QRIS statis menjadi payload QRIS
 * yang membawa nominal (tag 54), sehingga donatur TIDAK perlu mengetik
 * nominal manual di aplikasi e-wallet / m-banking.
 *
 * Cara kerja:
 *  1. Pisahkan bagian CRC (tag 63) dari payload.
 *  2. Sisipkan (atau ganti) tag 54 pada posisi kanonis EMVCo, yaitu setelah
 *     tag 53 "Currency Code". Byte lain TIDAK diubah sama sekali, jadi
 *     merchant id, nama merchant, kota, dan postal code tetap identik dengan
 *     QRIS statis asli.
 *  3. Hitung ulang CRC16-CCITT (EMVCo) untuk payload baru.
 *
 * Catatan penting: dari sisi acquirer (GoPay/Midtrans) QRIS hasil modifikasi
 * ini tetap diperlakukan sebagai QRIS statis. Artinya:
 *  - Donatur tetap boleh mengubah nominal sebelum membayar (bahkanungsi baik
 *    untuk donasi: donatur bisa membulatkan ke atas).
 *  - Status pembayaran TIDAK menjadi otomatis. QRIS statis tidak punya webhook
 *    ke merchant. Verifikasi tetap manual admin, atau otomatis bila nanti kita
 *    pasang gateway mutasi (lihat memory 10-pilihan-qris-dinamis-auto-confirm).
 *
 * Yang didapat dari modifikasi ini: satu QR per transaksi dengan nominal yang
 * sudah terisi + QR yang bisa dipakai ulang di halaman lacik donasi.
 */

/** Panjang field CRC EMVCo: tag 63 + panjang 04 (4 karakter hex). */
const CRC_LENGTH_FIELD = "6304";

/**
 * CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF, tanpa refleksi & xor akhir).
 * Ini algoritme yang wajib dipakai untuk EMVCo QR (termasuk QRIS).
 */
export function crc16Ccitt(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= (data.charCodeAt(i) & 0xff) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

type TagSpan = { start: number; end: number };

/**
 * Cari offset satu tag di dalam body payload (tanpa CRC).
 *
 * Panjang nilai selalu dibaca sebagai 2 digit. Semua nilai tag pada QRIS
 * (nama merchant <= 25, kota <= 15, merchant account info <= 99, dst) muat
 * dalam 2 digit, jadi aman. Bila struktur tidak konsisten, fungsi ini
 * mengembalikan null agar pemanggil bisa membatalkan proses.
 */
function findTag(body: string, target: string): TagSpan | null {
  let i = 0;
  while (i + 4 <= body.length) {
    const tag = body.slice(i, i + 2);
    if (!/^\d{2}$/.test(tag)) return null;
    const len = Number(body.slice(i + 2, i + 4));
    if (!Number.isFinite(len)) return null;
    const valueEnd = i + 4 + len;
    if (valueEnd > body.length) return null;
    if (tag === target) return { start: i, end: valueEnd };
    i = valueEnd;
  }
  return null;
}

/**
 * Pisahkan payload QRIS menjadi body (tanpa CRC) + nilai CRC.
 *
 * Struktur EMVCo: <body> + "63" + "04" + <CRC 4 hex>. Jadi field "6304"
 * berada 4 karakter dari ujung, bukan di ujung.
 */
function splitPayload(payload: string): { body: string; crc: string } | null {
  const trimmed = payload.trim();
  if (trimmed.length < 12) return null;
  if (trimmed.slice(-8, -4) !== CRC_LENGTH_FIELD) return null;
  const crc = trimmed.slice(-4);
  if (!/^[0-9A-F]{4}$/i.test(crc)) return null;
  const body = trimmed.slice(0, -8);
  if (!body.startsWith("0002")) return null;
  return { body, crc };
}

/**
 * Bangun payload QRIS dinamis berisi nominal.
 *
 * @param staticPayload payload QRIS statis (mis. dari `donation_settings.qris_payload`)
 * @param amount nominal rupiah (harus > 0)
 * @returns payload QRIS baru, atau null bila payload statis tidak valid
 */
export function buildDynamicQris(staticPayload: string, amount: number): string | null {
  const value = Math.round(Number(amount));
  if (!Number.isFinite(value) || value <= 0) return null;

  const parts = splitPayload(staticPayload);
  if (!parts) return null;

  const amountStr = String(value);
  const amountTlv = `54${String(amountStr.length).padStart(2, "0")}${amountStr}`;

  const existing = findTag(parts.body, "54");
  let body: string;
  if (existing) {
    // Ganti tag 54 lama (nominal sebelumnya) dengan nominal baru.
    body = parts.body.slice(0, existing.start) + amountTlv + parts.body.slice(existing.end);
  } else {
    const after53 = findTag(parts.body, "53");
    if (after53) {
      // Posisi kanonis: tag 54 selalu setelah tag 53 (Currency Code).
      body = parts.body.slice(0, after53.end) + amountTlv + parts.body.slice(after53.end);
    } else {
      body = parts.body + amountTlv;
    }
  }

  const crc = crc16Ccitt(body + CRC_LENGTH_FIELD);
  return body + CRC_LENGTH_FIELD + crc;
}

/**
 * Hitung nominal yang harus dibayar donatur bila biaya MDR/biaya QRIS
 * ditanggung oleh donatur.
 *
 * PENTING: MDR dipotong acquirer dari nominal yang dibayar, bukan dari
 * nominal donasi. Jadi cara naif "nominal + fee" bisa membuat merchant
 * rugi beberapa rupiah. Yang benar adalah gross-up:
 *
 *   bersih = nominal_dibayar x (1 - rate)
 *   nominal_dibayar = bersih / (1 - rate)
 *
 * Contoh (MDR 0,7%):
 *   donasi 10.000  ->  QRIS 10.071  ->  MDR dipotong 70  ->  masuk 10.001
 *   (target donasi 10.000 tercapai, selisih pembulatan <= 1 rupiah)
 *
 * @param netAmount nominal donasi (bersih, yang dihitung ke total campaign)
 * @param feeBps biaya MDR dalam basis points persen (70 = 0,70%)
 */
export function computeQrisCharge(
  netAmount: number,
  feeBps: number,
): { grossAmount: number; feeAmount: number } {
  const net = Math.round(Number(netAmount));
  if (!Number.isFinite(net) || net <= 0) return { grossAmount: 0, feeAmount: 0 };

  const bps = Math.max(0, Math.min(Math.round(Number(feeBps) || 0), 1000));
  if (bps === 0) return { grossAmount: net, feeAmount: 0 };

  const rate = bps / 10000;
  const gross = Math.ceil(net / (1 - rate));
  return { grossAmount: gross, feeAmount: gross - net };
}

/** Ambil nominal (tag 54) dari sebuah payload QRIS, atau null bila tidak ada. */
export function readQrisAmount(payload: string): number | null {
  const parts = splitPayload(payload);
  if (!parts) return null;
  const span = findTag(parts.body, "54");
  if (!span) return null;
  const len = Number(parts.body.slice(span.start + 2, span.start + 4));
  const raw = parts.body.slice(span.start + 4, span.start + 4 + len);
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Baca sub-template di dalam nilai sebuah tag. Tag 26 (Merchant Account
 * Information) berisi sub-template TLV, contoh pada QRIS GoPay:
 *   "0014COM.GO-JEK.WWW" (00 = scheme) + "0193690091431984093930" (01 = merchant id)
 */
function parseSubTemplates(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= value.length) {
    const tag = value.slice(i, i + 2);
    if (!/^\d{2}$/.test(tag)) break;
    const len = Number(value.slice(i + 2, i + 4));
    if (!Number.isFinite(len)) break;
    const valueEnd = i + 4 + len;
    if (valueEnd > value.length) break;
    out[tag] = value.slice(i + 4, valueEnd);
    i = valueEnd;
  }
  return out;
}

/** Ringkasan tag pada payload QRIS - dipakai untuk validasi di panel admin. */
export function inspectQrisPayload(payload: string): {
  valid: boolean;
  reason?: string;
  amount: number | null;
  merchantName: string | null;
  merchantId: string | null;
} {
  const parts = splitPayload(payload);
  if (!parts) {
    return { valid: false, reason: "Format payload QRIS tidak dikenali", amount: null, merchantName: null, merchantId: null };
  }
  const expected = crc16Ccitt(parts.body + CRC_LENGTH_FIELD);
  if (expected !== parts.crc.toUpperCase()) {
    return { valid: false, reason: "Checksum QRIS (CRC) tidak cocok", amount: null, merchantName: null, merchantId: null };
  }
  const nameTag = findTag(parts.body, "59");
  const merchantName = nameTag
    ? parts.body.slice(nameTag.start + 4, nameTag.end)
    : null;
  // Merchant id berada di sub-template "01" di dalam tag 26.
  const maiTag = findTag(parts.body, "26");
  let merchantId: string | null = null;
  if (maiTag) {
    const sub = parseSubTemplates(parts.body.slice(maiTag.start + 4, maiTag.end));
    merchantId = sub["01"] ?? null;
  }
  return {
    valid: true,
    amount: readQrisAmount(payload),
    merchantName,
    merchantId,
  };
}
