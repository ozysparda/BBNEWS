/**
 * Klien GoPay Merchant (GoBiz) - membaca mutasi QRIS milik merchant sendiri.
 *
 * TUJUAN
 * ------
 * QRIS statis (punya kita sendiri) tidak pernah mengirim webhook ke merchant.
 * Satu-satunya caraauto-confirm yang gratis adalah MENDETEKSI mutasi masuk
 * dari akun merchant kita sendiri, lalu mencocokkannya dengan transaksi
 * donasi yang masih "pending".
 *
 * Alur di file ini:
 *   1. Login GoID pakai OTP SMS (kode 4 digit) -> dapat access + refresh token.
 *   2. Ambil merchant id (GET /v1/users/me).
 *   3. Tarik feed transaksi (GET merchant-analytics/v2/merchants/transactions).
 *
 * CATATAN PENTING
 * ---------------
 * - Endpoint di bawah adalah endpoint privat portal GoPay Merchant (bukan API
 *   publik resmi). Endpoint ini bisa berubah sewaktu-waktu, makanya versi
 *   aplikasi bisa dioverride lewat env `GOPAY_APP_VERSION`.
 * - Kredensial TIDAK PERNAH disimpan di repo. Sesi disimpan terenkripsi di
 *   database (lihat `gopay-session.ts`), kuncinya dari env var.
 * - Tidak ada pihak ketiga yang pernah melihat kredensial: OTP masuk ke HP
 *   merchant itu sendiri, dan seluruh proses berjalan di server milik kita.
 *
 * Referensi implementasi (MIT, dibaca penuh - dipakai sebagai acuan shape):
 *   - kavionn/gobiz-payment
 *   - ItsAzni/gobiz-pay
 *   - AlfinAI/QrisMerchantID (dokumentasi endpoint + bentuk respons)
 */

/** Host API data merchant (mutasi, profil). */
const API_BASE_URL = "https://api.gobiz.co.id";
/** Host autentikasi GoID (login OTP / refresh token). */
const AUTH_BASE_URL = "https://portal.gofoodmerchant.co.id";
/** Feed transaksi (utama). */
const ANALYTICS_URL = "https://api.gojekapi.com/merchant-analytics/v2/merchants/transactions";
/** Feed jurnal (cadangan, kalau analytics kosong/gagal). */
const JOURNAL_URL = `${API_BASE_URL}/journals/search`;

/** Client id aplikasi web GoBiz. */
const CLIENT_ID = "go-biz-web-new";
/** App id dashboard merchant. */
const APP_ID = "go-biz-web-dashboard";
/** Build portal yang dipakai sebagai default (diperbarui 2026-10-03). */
const DEFAULT_APP_VERSION = "platform-v3.125.0-e1923971";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/148.0.0.0 Safari/537.36";
const PORTAL_ORIGIN = "https://portal.gofoodmerchant.co.id";

/** Status mutasi yang dianggap "dana sudah masuk". */
const PAID_STATUSES = new Set(["SETTLEMENT", "CAPTURE"]);
/** Tipe pembayaran yang dipakai (hanya QRIS). */
const QRIS_PAYMENT_TYPE = "QRIS";

export class GopayError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = "GopayError";
    this.status = status;
    this.code = code;
  }
}

export interface GopaySession {
  accessToken: string;
  refreshToken: string | null;
}

export interface GopayOtpRequest {
  otpToken: string;
  expiresInSeconds: number;
  otpLength: number;
}

export interface GopayProfile {
  merchantId: string | null;
  merchantName: string | null;
  raw: any;
}

/** Satu baris mutasi yang sudah dinormalisasi (nominal dalam rupiah). */
export interface QrisFeedEntry {
  /** Id unik transaksi di sisi GoPay (dipakai dedupe). */
  id: string;
  /** Order id QRIS (bisa dipakai sebagai bukti ke admin). */
  orderId: string | null;
  /** Nominal yang dibayar donatur, dalam rupiah penuh. */
  amount: number;
  /** Nilai mentah dari API (satuan kecil / sen). */
  rawAmount: number;
  /** Status mutasi (SETTLEMENT, CAPTURE, REFUND, ...). */
  status: string;
  /** Tipe pembayaran (QRIS). */
  paymentType: string;
  /** Waktu transaksi. */
  transactionTime: Date;
  /** Waktu settlement (bila ada). */
  settlementTime: Date | null;
}

function appVersion(): string {
  return process.env.GOPAY_APP_VERSION || DEFAULT_APP_VERSION;
}

function uniqueId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Header lengkap untuk panggilan `/goid/*` (butuh set perangkat). */
function authHeaders(accessToken?: string): Record<string, string> {
  return {
    accept: "application/json, text/plain, */*",
    "accept-language": "id",
    "authentication-type": "go-id",
    authorization: accessToken ? `Bearer ${accessToken}` : "Bearer",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "gojek-country-code": "ID",
    "gojek-timezone": "Asia/Jakarta",
    pragma: "no-cache",
    "user-agent": USER_AGENT,
    "x-appid": APP_ID,
    "x-appversion": appVersion(),
    "x-deviceos": "Web",
    "x-phonemake": "Windows 10 64-bit",
    "x-phonemodel": "Chrome 148.0.0.0 on Windows 10 64-bit",
    "x-platform": "Web",
    "x-uniqueid": uniqueId(),
    "x-user-locale": "en-US",
    "x-user-type": "merchant",
    origin: PORTAL_ORIGIN,
    referrer: `${PORTAL_ORIGIN}/`,
  };
}

/** Header ramping untuk pemanggilan API data (bukan /goid/*). */
function apiHeaders(accessToken?: string): Record<string, string> {
  return {
    accept: "application/json, text/plain, */*",
    "accept-language": "id",
    "authentication-type": "go-id",
    authorization: accessToken ? `Bearer ${accessToken}` : "Bearer",
    "cache-control": "no-cache",
    "content-type": "application/json",
    "gojek-country-code": "ID",
    "gojek-timezone": "Asia/Jakarta",
    pragma: "no-cache",
    "user-agent": USER_AGENT,
    "x-appid": APP_ID,
    "x-appversion": appVersion(),
    "x-platform": "Web",
    "x-user-type": "merchant",
    origin: PORTAL_ORIGIN,
    referrer: `${PORTAL_ORIGIN}/`,
  };
}

async function readError(res: Response): Promise<{ message: string; code: string | null }> {
  let raw = "";
  try {
    raw = await res.text();
  } catch {
    raw = "";
  }
  if (!raw) {
    return { message: `GoPay menjawab HTTP ${res.status}`, code: null };
  }
  try {
    const parsed = JSON.parse(raw);
    const first = Array.isArray(parsed?.errors) ? parsed.errors[0] : null;
    return {
      message: String(first?.message || parsed?.message || parsed?.error || `GoPay menjawab HTTP ${res.status}`),
      code: first?.code != null ? String(first.code) : null,
    };
  } catch {
    return { message: raw.slice(0, 300), code: null };
  }
}

async function goPayFetch(
  url: string,
  init: RequestInit,
  accessToken?: string,
  timeoutMs = 20000,
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) {
      const { message, code } = await readError(res);
      throw new GopayError(message, res.status, code);
    }
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new GopayError("Respons GoPay bukan JSON", res.status, null);
    }
  } catch (error: any) {
    if (error instanceof GopayError) throw error;
    if (error?.name === "AbortError") {
      throw new GopayError("Timeout saat menghubungi GoPay", null, null);
    }
    throw new GopayError(error?.message || "Gagal menghubungi GoPay", null, null);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Normalisasi nomor HP Indonesia ke format yang dipakai portal:
 * hanya digit, tanpa "+", tanpa awalan "62" dan tanpa awalan "0".
 */
export function normalizePhoneNumber(input: string): string {
  let phone = String(input || "")
    .replace(/[\s\-.,()]/g, "")
    .replace(/^\+/, "");
  if (phone.startsWith("62") && phone.length > 7) {
    phone = phone.slice(2);
  }
  phone = phone.replace(/^0+/, "");
  if (!/^\d{7,15}$/.test(phone)) {
    throw new GopayError("Nomor HP tidak valid. Contoh: 81234567890", 400, "invalid_phone");
  }
  return phone;
}

/**
 * Minta kode OTP SMS ke nomor HP akun GoPay Merchant.
 * Kode masuk ke HP merchant itu sendiri (tidak pernah lewat server kita).
 */
export async function requestLoginOtp(phoneNumber: string): Promise<GopayOtpRequest> {
  const phone = normalizePhoneNumber(phoneNumber);
  const body = {
    client_id: CLIENT_ID,
    phone_number: phone,
    country_code: "62",
  };
  const data = await goPayFetch(
    `${AUTH_BASE_URL}/goid/login/request`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(body) },
  );
  if (Array.isArray(data?.errors) && data.errors.length) {
    throw new GopayError(String(data.errors[0]?.message || "Gagal meminta OTP"), 400, "otp_request_failed");
  }
  const otpToken = data?.data?.otp_token;
  if (!otpToken) {
    throw new GopayError("GoPay tidak mengembalikan token OTP", 502, "otp_token_missing");
  }
  return {
    otpToken: String(otpToken),
    expiresInSeconds: Number(data?.data?.otp_expires_in) || 720,
    otpLength: Number(data?.data?.otp_length) || 4,
  };
}

/** Tukar kode OTP dengan sesi GoID (access + refresh token). */
export async function loginWithOtp(otp: string, otpToken: string): Promise<GopaySession> {
  const code = String(otp || "").trim();
  if (!/^\d{4,8}$/.test(code)) {
    throw new GopayError("Kode OTP harus berupa 4-8 digit angka", 400, "invalid_otp");
  }
  const body = {
    client_id: CLIENT_ID,
    grant_type: "otp",
    data: { otp: code, otp_token: otpToken },
  };
  const data = await goPayFetch(
    `${AUTH_BASE_URL}/goid/token`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(body) },
  );
  if (!data?.access_token) {
    const message =
      (Array.isArray(data?.errors) && data.errors[0]?.message) ||
      "Login gagal. Kode OTP salah atau sudah kadaluarsa.";
    throw new GopayError(String(message), 401, "otp_login_failed");
  }
  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
  };
}

/**
 * Perbarui sesi memakai refresh token.
 * Catatan: GoPay MEMUTAR refresh token, jadi hasil baru wajib disimpan.
 */
export async function refreshSession(refreshToken: string): Promise<GopaySession> {
  const body = {
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    data: { refresh_token: refreshToken },
  };
  const data = await goPayFetch(
    `${AUTH_BASE_URL}/goid/token`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify(body) },
  );
  if (!data?.access_token) {
    const message =
      (Array.isArray(data?.errors) && data.errors[0]?.message) ||
      "Sesi GoPay kedaluwarsa. Silakan login ulang dengan OTP.";
    throw new GopayError(String(message), 401, "refresh_failed");
  }
  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
  };
}

/** Ambil profil merchant (merchant id dipakai sebagai filter feed). */
export async function fetchProfile(accessToken: string): Promise<GopayProfile> {
  const data = await goPayFetch(
    `${API_BASE_URL}/v1/users/me`,
    { method: "GET", headers: apiHeaders(accessToken) },
    accessToken,
  );
  const user = data?.user || data?.data?.user || data?.data || data;
  const merchantId =
    user?.merchant_id || user?.merchantId || data?.merchant_id || data?.data?.merchant_id || null;
  const merchantName =
    user?.merchant_name || user?.name || user?.business_name || data?.merchant_name || null;
  return {
    merchantId: merchantId ? String(merchantId) : null,
    merchantName: merchantName ? String(merchantName) : null,
    raw: data,
  };
}

/**
 * Ubah nominal minor unit (sen) menjadi rupiah.
 *
 * GoPay mengirim nominal dalam satuan terkecil (1/100 rupiah). Pembayaran
 * QRIS dalam rupiah penuh selalu kelipatan 100 sen, jadi:
 *   - 1007100 sen -> 10071 rupiah (pembagian biasa)
 *   - 10071 (tidak kelipatan 100) -> anggap sudah rupiah (fallback aman)
 */
export function toRupiah(minorUnits: number): number {
  if (!Number.isFinite(minorUnits)) return 0;
  const value = Math.abs(Math.trunc(minorUnits));
  if (value === 0) return 0;
  if (value % 100 === 0) return value / 100;
  return value;
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function pickRawAmount(tx: any): number {
  const candidates = [tx?.gross_amount, tx?.real_gross_amount, tx?.amount, tx?.total_amount];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function normalizeFeedEntry(tx: any): QrisFeedEntry | null {
  if (!tx || typeof tx !== "object") return null;
  const status = String(tx.transaction_status || tx.status || "").toUpperCase();
  const paymentType = String(tx.payment_type || tx.transaction_payment_type || "").toUpperCase();
  const rawAmount = pickRawAmount(tx);
  if (!rawAmount) return null;
  const transactionTime =
    parseDate(tx.transaction_time) || parseDate(tx.settlement_time) || parseDate(tx.created_at);
  if (!transactionTime) return null;
  const id = String(
    tx.transaction_id || tx.id || tx.order_id || tx.reference_id || `${transactionTime.getTime()}-${rawAmount}`,
  );
  return {
    id,
    orderId: tx.order_id ? String(tx.order_id) : null,
    amount: toRupiah(rawAmount),
    rawAmount,
    status,
    paymentType,
    transactionTime,
    settlementTime: parseDate(tx.settlement_time),
  };
}

function isoUtc(date: Date): string {
  return `${date.toISOString().slice(0, 19)}.000Z`;
}

/**
 * Tarik feed mutasi QRIS.
 *
 * Feed utama = merchant-analytics. Kalau kosong / gagal, dicoba journals
 * (endpoint cadangan yang dipakai portal).
 */
export async function fetchQrissFeed(options: {
  accessToken: string;
  merchantId: string | null;
  startTime: Date;
  endTime?: Date;
  size?: number;
}): Promise<QrisFeedEntry[]> {
  const { accessToken, merchantId } = options;
  const endTime = options.endTime ?? new Date();
  const size = Math.min(200, Math.max(10, options.size ?? 100));

  const params = new URLSearchParams();
  params.set("from", "0");
  params.set("size", String(size));
  params.set("statuses", "SETTLEMENT,CAPTURE,REFUND,PARTIAL_REFUND");
  params.set("payment_types", "QRIS,GOPAY,OFFLINE_CREDIT_CARD,OFFLINE_DEBIT_CARD,CREDIT_CARD");
  params.set("start_time", isoUtc(options.startTime));
  params.set("end_time", isoUtc(endTime));
  if (merchantId) params.set("merchant_ids", merchantId);

  try {
    const data = await goPayFetch(
      `${ANALYTICS_URL}?${params.toString()}`,
      { method: "GET", headers: apiHeaders(accessToken) },
      accessToken,
    );
    const transactions: any[] = Array.isArray(data?.transactions) ? data.transactions : [];
    const entries: QrisFeedEntry[] = transactions
      .map((tx) => normalizeFeedEntry(tx))
      .filter((entry): entry is QrisFeedEntry => entry !== null);
    if (entries.length > 0) return entries;
  } catch (error: any) {
    if (error instanceof GopayError && (error.status === 401 || error.status === 403)) {
      throw error;
    }
    // Fall through ke journals.
  }

  // Cadangan: journals/search (butuh header khusus + body DSL).
  const journalBody = {
    from: 0,
    size,
    sort: { time: { order: "desc" } },
    included_categories: { incoming: ["transaction_share", "action"] },
    query: [
      {
        op: "and",
        clauses: [
          {
            field: "metadata.transaction.status",
            op: "in",
            value: ["settlement", "capture", "refund", "partial_refund"],
          },
          {
            field: "metadata.transaction.payment_type",
            op: "in",
            value: ["qris", "gopay", "offline_credit_card", "offline_debit_card", "credit_card"],
          },
          { field: "metadata.transaction.transaction_time", op: "gte", value: isoUtc(options.startTime) },
          { field: "metadata.transaction.transaction_time", op: "lte", value: isoUtc(endTime) },
          ...(merchantId
            ? [{ field: "metadata.transaction.merchant_id", op: "equal", value: merchantId }]
            : []),
        ],
      },
    ],
  };

  const data = await goPayFetch(
    JOURNAL_URL,
    {
      method: "POST",
      headers: {
        ...apiHeaders(accessToken),
        accept: "application/json, text/plain, */*, application/vnd.journal.v1+json",
        "x-client-id": "gobiz-web",
      },
      body: JSON.stringify(journalBody),
    },
    accessToken,
  );

  const rows: any[] = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.journals)
      ? data.journals
      : [];
  const journalEntries = rows
    .map((row) => normalizeFeedEntry(row?.metadata?.transaction || row?.transaction || row))
    .filter((entry): entry is QrisFeedEntry => entry !== null);
  return journalEntries;
}

/** Saring feed: hanya QRIS yang statusnya "dana sudah masuk". */
export function filterPaidQrissEntries(entries: QrisFeedEntry[]): QrisFeedEntry[] {
  return entries.filter(
    (entry) =>
      (entry.paymentType === QRIS_PAYMENT_TYPE || entry.paymentType === "") &&
      PAID_STATUSES.has(entry.status),
  );
}
