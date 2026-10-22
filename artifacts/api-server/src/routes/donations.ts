import { Router } from "express";
import { db } from "@workspace/db";
import {
  donationCampaignsTable,
  donationTransactionsTable,
  donationSettingsTable,
} from "@workspace/db/schema";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import slugify from "slugify";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { verifyCryptoTransaction } from "../lib/crypto";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

const router = Router();

const CAMPAIGN_STATUSES = ["draft", "active", "closed", "archived"] as const;
const TRANSACTION_STATUSES = ["pending", "verified", "rejected"] as const;
const PAYMENT_METHODS = ["qris", "bank", "crypto"] as const;

const collectedAmountSql = sql<number>`COALESCE(SUM(CASE WHEN ${donationTransactionsTable.status} = 'verified' THEN ${donationTransactionsTable.amount} ELSE 0 END), 0)::int`;
const verifiedCountSql = sql<number>`COUNT(*) FILTER (WHERE ${donationTransactionsTable.status} = 'verified')::int`;
const pendingCountSql = sql<number>`COUNT(*) FILTER (WHERE ${donationTransactionsTable.status} = 'pending')::int`;

function getClientIp(req: { headers: Record<string, unknown>; ip?: string }): string {
  // Vercel menetapkan req.ip dari sisi platform; pakai itu dulu agar tidak bisa
  // dipalsukan lewat header x-forwarded-for oleh klien.
  if (req.ip && req.ip.length > 0) return req.ip;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0].trim();
  return "unknown";
}

function generateReference(): string {
  const year = new Date().getFullYear();
  const random = String(Math.floor(Math.random() * 900000) + 100000);
  return `BGK-DON-${year}-${random}`;
}

function toIso(value: Date | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

function formatCampaign(row: any) {
  return {
    ...row,
    startAt: toIso(row.startAt),
    deadline: toIso(row.deadline),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    progress:
      row.targetAmount > 0
        ? Math.min(100, Math.round(((row.collectedAmount ?? 0) / row.targetAmount) * 100))
        : 0,
  };
}

function formatTransaction(row: any) {
  return {
    ...row,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    verifiedAt: toIso(row.verifiedAt),
  };
}

function parseAmount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

function toNullableTimestamp(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true }) || "campaign";
  let candidate = base;
  let counter = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [existing] = await db
      .select({ id: donationCampaignsTable.id })
      .from(donationCampaignsTable)
      .where(eq(donationCampaignsTable.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

function campaignSelect() {
  return {
    id: donationCampaignsTable.id,
    slug: donationCampaignsTable.slug,
    title: donationCampaignsTable.title,
    excerpt: donationCampaignsTable.excerpt,
    content: donationCampaignsTable.content,
    coverImageUrl: donationCampaignsTable.coverImageUrl,
    targetAmount: donationCampaignsTable.targetAmount,
    qrisImageUrl: donationCampaignsTable.qrisImageUrl,
    qrisPayload: donationCampaignsTable.qrisPayload,
    bankName: donationCampaignsTable.bankName,
    bankAccountNumber: donationCampaignsTable.bankAccountNumber,
    bankAccountHolder: donationCampaignsTable.bankAccountHolder,
    cryptoNetwork: donationCampaignsTable.cryptoNetwork,
    cryptoSymbol: donationCampaignsTable.cryptoSymbol,
    cryptoAddress: donationCampaignsTable.cryptoAddress,
    autoConfirm: donationCampaignsTable.autoConfirm,
    minAmount: donationCampaignsTable.minAmount,
    status: donationCampaignsTable.status,
    startAt: donationCampaignsTable.startAt,
    deadline: donationCampaignsTable.deadline,
    createdAt: donationCampaignsTable.createdAt,
    updatedAt: donationCampaignsTable.updatedAt,
    collectedAmount: collectedAmountSql,
    donorCount: verifiedCountSql,
    pendingCount: pendingCountSql,
  };
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------

// Public: pengaturan umum Berugak Donasi
router.get("/donations/settings", async (req, res) => {
  try {
    const [settings] = await db
      .select()
      .from(donationSettingsTable)
      .where(eq(donationSettingsTable.id, 1))
      .limit(1);
    res.json(settings ?? { heroTitle: "Berugak Donasi", isOpen: true });
  } catch (error) {
    console.error("Error fetching donation settings:", error);
    res.status(500).json({ error: "Gagal memuat pengaturan donasi" });
  }
});

// Public: daftar campaign aktif
router.get("/donations/campaigns", async (req, res) => {
  try {
    const rows = await db
      .select(campaignSelect())
      .from(donationCampaignsTable)
      .leftJoin(
        donationTransactionsTable,
        eq(donationTransactionsTable.campaignId, donationCampaignsTable.id),
      )
      .where(eq(donationCampaignsTable.status, "active"))
      .groupBy(donationCampaignsTable.id)
      .orderBy(asc(donationCampaignsTable.deadline));

    res.json(rows.map(formatCampaign));
  } catch (error) {
    console.error("Error fetching donation campaigns:", error);
    res.status(500).json({ error: "Gagal memuat campaign donasi" });
  }
});

// Public: detail satu campaign
router.get("/donations/campaigns/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug || "");
    const rows = await db
      .select(campaignSelect())
      .from(donationCampaignsTable)
      .leftJoin(
        donationTransactionsTable,
        eq(donationTransactionsTable.campaignId, donationCampaignsTable.id),
      )
      .where(eq(donationCampaignsTable.slug, slug))
      .groupBy(donationCampaignsTable.id)
      .limit(1);

    const campaign = rows[0];
    if (!campaign) {
      res.status(404).json({ error: "Campaign tidak ditemukan" });
      return;
    }
    if (campaign.status !== "active" && campaign.status !== "closed") {
      res.status(404).json({ error: "Campaign tidak ditemukan" });
      return;
    }

    // Donatur yang tidak boleh melihat identitas (anonim) tidak ditampilkan
    const recent = await db
      .select({
        id: donationTransactionsTable.id,
        donorName: donationTransactionsTable.donorName,
        isAnonymous: donationTransactionsTable.isAnonymous,
        amount: donationTransactionsTable.amount,
        message: donationTransactionsTable.message,
        createdAt: donationTransactionsTable.createdAt,
      })
      .from(donationTransactionsTable)
      .where(
        and(
          eq(donationTransactionsTable.campaignId, campaign.id),
          eq(donationTransactionsTable.status, "verified"),
        ),
      )
      .orderBy(desc(donationTransactionsTable.createdAt))
      .limit(20);

    res.json({
      ...formatCampaign(campaign),
      recentDonations: recent.map((item: any) => ({
        ...item,
        donorName: item.isAnonymous ? "Hamba Tuhan" : item.donorName,
        createdAt: toIso(item.createdAt),
      })),
    });
  } catch (error) {
    console.error("Error fetching donation campaign:", error);
    res.status(500).json({ error: "Gagal memuat campaign donasi" });
  }
});

// Public: kirim donasi
router.post("/donations/transactions", async (req, res) => {
  try {
    const {
      campaignId,
      campaignSlug,
      donorName,
      donorEmail,
      donorPhone,
      amount,
      cryptoAmount,
      txHash,
      method,
      message,
      proofUrl,
      isAnonymous,
    } = req.body || {};

    const campaignRows = await db
      .select()
      .from(donationCampaignsTable)
      .where(
        campaignSlug
          ? eq(donationCampaignsTable.slug, String(campaignSlug))
          : eq(donationCampaignsTable.id, Number(campaignId)),
      )
      .limit(1);
    const campaign = campaignRows[0];

    if (!campaign) {
      res.status(404).json({ error: "Campaign tidak ditemukan" });
      return;
    }
    if (campaign.status !== "active") {
      res.status(400).json({ error: "Campaign ini sudah tidak menerima donasi" });
      return;
    }

    const name = toNullableString(donorName);
    if (!name || name.length < 2) {
      res.status(400).json({ error: "Nama donatur wajib diisi" });
      return;
    }
    if (name.length > 100) {
      res.status(400).json({ error: "Nama donatur terlalu panjang (maks 100 karakter)" });
      return;
    }

    const email = toNullableString(donorEmail)?.toLowerCase() ?? null;
    if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      res.status(400).json({ error: "Format email tidak valid" });
      return;
    }
    const phone = toNullableString(donorPhone);
    if (phone && phone.length > 30) {
      res.status(400).json({ error: "Nomor telepon terlalu panjang" });
      return;
    }
    if (typeof method !== "undefined" && method !== null && method !== "" && !PAYMENT_METHODS.includes(method as any)) {
      res.status(400).json({ error: "Metode pembayaran tidak valid" });
      return;
    }
    const paymentMethod = (PAYMENT_METHODS.includes(method as any) ? String(method) : "qris") as (typeof PAYMENT_METHODS)[number];
    const rupiah = parseAmount(amount);
    const crypto = toNullableString(cryptoAmount);
    if (crypto && crypto.length > 50) {
      res.status(400).json({ error: "Nominal kripto terlalu panjang" });
      return;
    }
    const hash = toNullableString(txHash);
    if (hash && hash.length > 200) {
      res.status(400).json({ error: "tx hash terlalu panjang" });
      return;
    }
    const proof = toNullableString(proofUrl);
    if (proof && proof.length > 500) {
      res.status(400).json({ error: "URL bukti terlalu panjang" });
      return;
    }
    const note = toNullableString(message);
    if (note && note.length > 500) {
      res.status(400).json({ error: "Pesan terlalu panjang (maks 500 karakter)" });
      return;
    }
    const anonymous = isAnonymous === true || isAnonymous === "true";

    if (paymentMethod === "crypto") {
      if (!hash) {
        res.status(400).json({ error: "tx hash wajib diisi untuk donasi kripto" });
        return;
      }
      if (!campaign.cryptoAddress) {
        res.status(400).json({ error: "Campaign ini tidak menerima donasi kripto" });
        return;
      }
    } else if (rupiah < (campaign.minAmount || 1000)) {
      res.status(400).json({
        error: `Minimal donasi campaign ini Rp ${(campaign.minAmount || 1000).toLocaleString("id-ID")}`,
      });
      return;
    }

    // Cegah tx hash yang sama dipakai ulang
    if (hash) {
      const [duplicated] = await db
        .select({ id: donationTransactionsTable.id })
        .from(donationTransactionsTable)
        .where(eq(donationTransactionsTable.txHash, hash))
        .limit(1);
      if (duplicated) {
        res.status(409).json({ error: "tx hash ini sudah pernah dipakai" });
        return;
      }
    }

    // Generate reference number dengan retry (hindari collision pada unique constraint)
    let transaction: any;
    let referenceNumber = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      referenceNumber = generateReference();
      try {
        const [inserted] = await db
          .insert(donationTransactionsTable)
          .values({
            referenceNumber,
            campaignId: campaign.id,
            donorName: name,
            donorEmail: email,
            donorPhone: phone,
            isAnonymous: anonymous,
            amount: rupiah,
            cryptoAmount: crypto,
            cryptoNetwork: campaign.cryptoNetwork,
            txHash: hash,
            method: paymentMethod,
            message: note,
            proofUrl: proof,
            status: "pending",
          })
          .returning();
        transaction = inserted;
        break;
      } catch (error: any) {
        const isUniqueViolation =
          error?.code === "23505" ||
          (typeof error?.message === "string" && error.message.includes("unique"));
        if (!isUniqueViolation || attempt === 4) throw error;
      }
    }
    if (!transaction) {
      res.status(500).json({ error: "Gagal membuat transaksi donasi" });
      return;
    }

    // Auto konfirmasi kripto (kalau campaign mengaktifkan & tx-nya valid)
    let autoVerified = false;
    let autoNote: string | undefined;
    if (paymentMethod === "crypto" && campaign.autoConfirm && hash) {
      const result = await verifyCryptoTransaction(
        campaign.cryptoNetwork,
        hash,
        campaign.cryptoAddress,
      );
      if (result.confirmed) {
        await db
          .update(donationTransactionsTable)
          .set({
            status: "verified",
            verifiedAt: new Date(),
            verifiedBy: "auto-verifikasi",
            autoVerified: true,
            updatedAt: new Date(),
          })
          .where(eq(donationTransactionsTable.id, transaction.id));
        autoVerified = true;
      } else {
        autoNote = result.note;
      }
    }

    res.status(201).json({
      referenceNumber,
      status: autoVerified ? "verified" : "pending",
      autoVerified,
      note: autoNote,
      message: autoVerified
        ? "Donasi kamu terverifikasi otomatis. Terima kasih!"
        : "Donasi tercatat. Admin akan memverifikasi dalam 1x24 jam.",
      donorName: anonymous ? "Hamba Tuhan" : name,
    });
  } catch (error) {
    console.error("Error creating donation transaction:", error);
    res.status(500).json({ error: "Gagal menyimpan donasi" });
  }
});

// Public: cek status donasi pakai nomor referensi
router.get("/donations/transactions/:reference", async (req, res) => {
  try {
    const reference = String(req.params.reference || "").trim().toUpperCase();
    const email = String(req.query.email || "").trim().toLowerCase();

    const [transaction] = await db
      .select()
      .from(donationTransactionsTable)
      .where(eq(donationTransactionsTable.referenceNumber, reference))
      .limit(1);

    if (!transaction) {
      res.status(404).json({ error: "Nomor referensi tidak ditemukan" });
      return;
    }
    if (transaction.donorEmail && email && transaction.donorEmail !== email) {
      res.status(404).json({ error: "Nomor referensi atau email tidak cocok" });
      return;
    }

    const [campaign] = await db
      .select({ title: donationCampaignsTable.title, slug: donationCampaignsTable.slug })
      .from(donationCampaignsTable)
      .where(eq(donationCampaignsTable.id, transaction.campaignId))
      .limit(1);

    res.json({
      referenceNumber: transaction.referenceNumber,
      status: transaction.status,
      amount: transaction.amount,
      cryptoAmount: transaction.cryptoAmount,
      method: transaction.method,
      message: transaction.message,
      adminNote: transaction.status === "verified" ? transaction.adminNote : null,
      autoVerified: transaction.autoVerified,
      campaignTitle: campaign?.title ?? null,
      campaignSlug: campaign?.slug ?? null,
      createdAt: toIso(transaction.createdAt),
      verifiedAt: toIso(transaction.verifiedAt),
    });
  } catch (error) {
    console.error("Error tracking donation:", error);
    res.status(500).json({ error: "Gagal memuat status donasi" });
  }
});

// Public: token upload bukti transfer (butuh file gambar)
const uploadCounter = new Map<string, { count: number; resetAt: number }>();
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const UPLOAD_MAX_PER_WINDOW = 8;

router.post("/donations/upload-token", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const now = Date.now();
    const entry = uploadCounter.get(ip);
    if (!entry || now > entry.resetAt) {
      uploadCounter.set(ip, { count: 1, resetAt: now + UPLOAD_WINDOW_MS });
    } else {
      entry.count += 1;
      if (entry.count > UPLOAD_MAX_PER_WINDOW) {
        res.status(429).json({ error: "Terlalu banyak unggahan. Coba lagi nanti." });
        return;
      }
    }

    const { name } = req.body || {};
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "Missing or invalid file name" });
      return;
    }
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-60);
    if (!/\.(png|jpe?g|webp|gif)$/i.test(safeName)) {
      res.status(400).json({ error: "Hanya file gambar yang diizinkan" });
      return;
    }

    const rwToken = process.env.BLOB_READ_WRITE_TOKEN || null;
    if (!rwToken) {
      res.status(500).json({ error: "Penyimpanan belum dikonfigurasi" });
      return;
    }

    const pathname = `uploads/donasi/${Date.now()}-${safeName}`;
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: rwToken,
      pathname,
    });

    res.json({ token: clientToken, pathname });
  } catch (error) {
    console.error("Error generating donation upload token:", error);
    res.status(500).json({ error: "Gagal membuat token unggah" });
  }
});

// Webhook payment gateway (opsional) - dipakai kalau nanti pakai Midtrans/Xendit.
router.post("/donations/webhook", async (req, res) => {
  try {
    const secret = process.env.DONATION_WEBHOOK_SECRET;
    if (!secret) {
      res.status(404).json({ error: "Webhook tidak aktif" });
      return;
    }
    const provided = String(req.headers["x-donation-secret"] || "");
    if (provided !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { referenceNumber, status, amount, adminNote } = req.body || {};
    if (!referenceNumber) {
      res.status(400).json({ error: "referenceNumber wajib diisi" });
      return;
    }

    const [transaction] = await db
      .select()
      .from(donationTransactionsTable)
      .where(eq(donationTransactionsTable.referenceNumber, String(referenceNumber)))
      .limit(1);
    if (!transaction) {
      res.status(404).json({ error: "Transaksi tidak ditemukan" });
      return;
    }

    const nextStatus = status === "verified" ? "verified" : "rejected";
    await db
      .update(donationTransactionsTable)
      .set({
        status: nextStatus,
        verifiedAt: new Date(),
        verifiedBy: "webhook",
        adminNote: toNullableString(adminNote),
        updatedAt: new Date(),
      })
      .where(eq(donationTransactionsTable.id, transaction.id));

    res.json({ ok: true, referenceNumber, status: nextStatus, amount });
  } catch (error) {
    console.error("Error processing donation webhook:", error);
    res.status(500).json({ error: "Gagal memproses webhook" });
  }
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

// Admin: daftar semua campaign
router.get("/admin/donations/campaigns", requireAuth, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const conditions: (SQL | undefined)[] = [];
    if (search) {
      conditions.push(ilike(donationCampaignsTable.title, `%${search}%`));
    }
    if (status && CAMPAIGN_STATUSES.includes(status as any)) {
      conditions.push(eq(donationCampaignsTable.status, status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      db.select({ count: count() }).from(donationCampaignsTable).where(where),
      db
        .select(campaignSelect())
        .from(donationCampaignsTable)
        .leftJoin(
          donationTransactionsTable,
          eq(donationTransactionsTable.campaignId, donationCampaignsTable.id),
        )
        .where(where)
        .groupBy(donationCampaignsTable.id)
        .orderBy(desc(donationCampaignsTable.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;
    res.json({
      campaigns: rows.map(formatCampaign),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching admin donation campaigns:", error);
    res.status(500).json({ error: "Gagal memuat campaign donasi" });
  }
});

// Admin: detail campaign
router.get("/admin/donations/campaigns/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const rows = await db
      .select(campaignSelect())
      .from(donationCampaignsTable)
      .leftJoin(
        donationTransactionsTable,
        eq(donationTransactionsTable.campaignId, donationCampaignsTable.id),
      )
      .where(eq(donationCampaignsTable.id, id))
      .groupBy(donationCampaignsTable.id)
      .limit(1);
    if (!rows[0]) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(formatCampaign(rows[0]));
  } catch (error) {
    console.error("Error fetching donation campaign:", error);
    res.status(500).json({ error: "Gagal memuat campaign donasi" });
  }
});

// Admin: buat campaign baru
router.post("/admin/donations/campaigns", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body || {};
    const title = toNullableString(body.title);
    if (!title || title.length < 4) {
      res.status(400).json({ error: "Judul campaign minimal 4 karakter" });
      return;
    }
    if (title.length > 200) {
      res.status(400).json({ error: "Judul campaign terlalu panjang (maks 200 karakter)" });
      return;
    }

    const status = CAMPAIGN_STATUSES.includes(body.status as any) ? String(body.status) : "draft";
    const slug = await uniqueSlug(title);

    const [campaign] = await db
      .insert(donationCampaignsTable)
      .values({
        slug,
        title,
        excerpt: toNullableString(body.excerpt) ?? "",
        content: toNullableString(body.content) ?? "",
        coverImageUrl: toNullableString(body.coverImageUrl),
        targetAmount: parseAmount(body.targetAmount),
        qrisImageUrl: toNullableString(body.qrisImageUrl),
        qrisPayload: toNullableString(body.qrisPayload),
        bankName: toNullableString(body.bankName),
        bankAccountNumber: toNullableString(body.bankAccountNumber),
        bankAccountHolder: toNullableString(body.bankAccountHolder),
        cryptoNetwork: toNullableString(body.cryptoNetwork),
        cryptoSymbol: toNullableString(body.cryptoSymbol),
        cryptoAddress: toNullableString(body.cryptoAddress),
        autoConfirm: body.autoConfirm === true || body.autoConfirm === "true",
        minAmount: Math.max(0, parseAmount(body.minAmount) || 1000),
        status,
        startAt: toNullableTimestamp(body.startAt),
        deadline: toNullableTimestamp(body.deadline),
        createdBy: req.adminUsername ?? "admin",
      })
      .returning();

    res.status(201).json(formatCampaign({ ...campaign, collectedAmount: 0, donorCount: 0, pendingCount: 0 }));
  } catch (error) {
    console.error("Error creating donation campaign:", error);
    res.status(500).json({ error: "Gagal membuat campaign donasi" });
  }
});

// Admin: ubah campaign
router.put("/admin/donations/campaigns/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [existing] = await db
      .select()
      .from(donationCampaignsTable)
      .where(eq(donationCampaignsTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const body = req.body || {};
    const status =
      body.status !== undefined && CAMPAIGN_STATUSES.includes(body.status as any)
        ? String(body.status)
        : existing.status;

    const [campaign] = await db
      .update(donationCampaignsTable)
      .set({
        title: toNullableString(body.title) ?? existing.title,
        excerpt: body.excerpt !== undefined ? toNullableString(body.excerpt) ?? "" : existing.excerpt,
        content: body.content !== undefined ? toNullableString(body.content) ?? "" : existing.content,
        coverImageUrl:
          body.coverImageUrl !== undefined
            ? toNullableString(body.coverImageUrl)
            : existing.coverImageUrl,
        targetAmount:
          body.targetAmount !== undefined ? parseAmount(body.targetAmount) : existing.targetAmount,
        qrisImageUrl:
          body.qrisImageUrl !== undefined ? toNullableString(body.qrisImageUrl) : existing.qrisImageUrl,
        qrisPayload:
          body.qrisPayload !== undefined ? toNullableString(body.qrisPayload) : existing.qrisPayload,
        bankName: body.bankName !== undefined ? toNullableString(body.bankName) : existing.bankName,
        bankAccountNumber:
          body.bankAccountNumber !== undefined
            ? toNullableString(body.bankAccountNumber)
            : existing.bankAccountNumber,
        bankAccountHolder:
          body.bankAccountHolder !== undefined
            ? toNullableString(body.bankAccountHolder)
            : existing.bankAccountHolder,
        cryptoNetwork:
          body.cryptoNetwork !== undefined
            ? toNullableString(body.cryptoNetwork)
            : existing.cryptoNetwork,
        cryptoSymbol:
          body.cryptoSymbol !== undefined ? toNullableString(body.cryptoSymbol) : existing.cryptoSymbol,
        cryptoAddress:
          body.cryptoAddress !== undefined ? toNullableString(body.cryptoAddress) : existing.cryptoAddress,
        autoConfirm:
          body.autoConfirm !== undefined
            ? body.autoConfirm === true || body.autoConfirm === "true"
            : existing.autoConfirm,
        minAmount:
          body.minAmount !== undefined
            ? Math.max(0, parseAmount(body.minAmount) || existing.minAmount)
            : existing.minAmount,
        status,
        startAt: body.startAt !== undefined ? toNullableTimestamp(body.startAt) : existing.startAt,
        deadline: body.deadline !== undefined ? toNullableTimestamp(body.deadline) : existing.deadline,
        updatedAt: new Date(),
      })
      .where(eq(donationCampaignsTable.id, id))
      .returning();

    res.json(formatCampaign({ ...campaign, collectedAmount: 0, donorCount: 0, pendingCount: 0 }));
  } catch (error) {
    console.error("Error updating donation campaign:", error);
    res.status(500).json({ error: "Gagal memperbarui campaign donasi" });
  }
});

// Admin: hapus campaign
router.delete("/admin/donations/campaigns/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await db.delete(donationCampaignsTable).where(eq(donationCampaignsTable.id, id));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting donation campaign:", error);
    res.status(500).json({ error: "Gagal menghapus campaign donasi" });
  }
});

// Admin: daftar transaksi donasi
router.get("/admin/donations/transactions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const campaignId = toNullableInt(req.query.campaignId);
    const search = req.query.search as string | undefined;

    const conditions: (SQL | undefined)[] = [];
    if (status && TRANSACTION_STATUSES.includes(status as any)) {
      conditions.push(eq(donationTransactionsTable.status, status));
    }
    if (campaignId !== null) {
      conditions.push(eq(donationTransactionsTable.campaignId, campaignId));
    }
    if (search) {
      conditions.push(
        or(
          ilike(donationTransactionsTable.referenceNumber, `%${search}%`),
          ilike(donationTransactionsTable.donorName, `%${search}%`),
          ilike(donationTransactionsTable.donorEmail, `%${search}%`),
          ilike(donationTransactionsTable.txHash, `%${search}%`),
        ),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      db.select({ count: count() }).from(donationTransactionsTable).where(where),
      db
        .select()
        .from(donationTransactionsTable)
        .where(where)
        .orderBy(desc(donationTransactionsTable.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalResult[0]?.count ?? 0;
    res.json({
      transactions: rows.map(formatTransaction),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching donation transactions:", error);
    res.status(500).json({ error: "Gagal memuat transaksi donasi" });
  }
});

// Admin: verifikasi / tolak transaksi
router.patch("/admin/donations/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (Number.isNaN(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { status, adminNote } = req.body || {};
    if (!status || !TRANSACTION_STATUSES.includes(status as any)) {
      res.status(400).json({ error: "status tidak valid" });
      return;
    }
    if (adminNote !== undefined && adminNote !== null && String(adminNote).length > 500) {
      res.status(400).json({ error: "Catatan admin terlalu panjang (maks 500 karakter)" });
      return;
    }

    const [existing] = await db
      .select()
      .from(donationTransactionsTable)
      .where(eq(donationTransactionsTable.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "Transaksi tidak ditemukan" });
      return;
    }

    await db
      .update(donationTransactionsTable)
      .set({
        status,
        adminNote: toNullableString(adminNote),
        verifiedAt: status === "pending" ? null : new Date(),
        verifiedBy: status === "pending" ? null : (req.adminUsername ?? "admin"),
        updatedAt: new Date(),
      })
      .where(eq(donationTransactionsTable.id, id));

    const [updated] = await db
      .select()
      .from(donationTransactionsTable)
      .where(eq(donationTransactionsTable.id, id))
      .limit(1);

    res.json(formatTransaction(updated));
  } catch (error) {
    console.error("Error updating donation transaction:", error);
    res.status(500).json({ error: "Gagal memperbarui transaksi donasi" });
  }
});

// Admin: ringkasan donasi
router.get("/admin/donations/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [campaignTotals] = await db
      .select({
        activeCampaigns: sql<number>`COUNT(*) FILTER (WHERE ${donationCampaignsTable.status} = 'active')::int`,
        totalCampaigns: sql<number>`COUNT(*)::int`,
      })
      .from(donationCampaignsTable);

    const [txTotals] = await db
      .select({
        collected: sql<number>`COALESCE(SUM(CASE WHEN ${donationTransactionsTable.status} = 'verified' THEN ${donationTransactionsTable.amount} ELSE 0 END), 0)::int`,
        pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${donationTransactionsTable.status} = 'pending')::int`,
        verifiedCount: sql<number>`COUNT(*) FILTER (WHERE ${donationTransactionsTable.status} = 'verified')::int`,
      })
      .from(donationTransactionsTable);

    res.json({
      activeCampaigns: campaignTotals?.activeCampaigns ?? 0,
      totalCampaigns: campaignTotals?.totalCampaigns ?? 0,
      collectedAmount: txTotals?.collected ?? 0,
      pendingCount: txTotals?.pendingCount ?? 0,
      verifiedCount: txTotals?.verifiedCount ?? 0,
      donorCount: txTotals?.verifiedCount ?? 0,
    });
  } catch (error) {
    console.error("Error fetching donation stats:", error);
    res.status(500).json({ error: "Gagal memuat ringkasan donasi" });
  }
});

// Admin: pengaturan global donasi
router.get("/admin/donations/settings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [settings] = await db
      .select()
      .from(donationSettingsTable)
      .where(eq(donationSettingsTable.id, 1))
      .limit(1);
    res.json(settings ?? { id: 1, heroTitle: "Berugak Donasi", isOpen: true });
  } catch (error) {
    console.error("Error fetching donation settings:", error);
    res.status(500).json({ error: "Gagal memuat pengaturan donasi" });
  }
});

router.put("/admin/donations/settings", requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body || {};
    const values = {
      heroTitle: toNullableString(body.heroTitle) ?? "Berugak Donasi",
      heroDescription: toNullableString(body.heroDescription) ?? "",
      qrisImageUrl: toNullableString(body.qrisImageUrl),
      qrisPayload: toNullableString(body.qrisPayload),
      bankName: toNullableString(body.bankName),
      bankAccountNumber: toNullableString(body.bankAccountNumber),
      bankAccountHolder: toNullableString(body.bankAccountHolder),
      isOpen: body.isOpen === undefined ? true : body.isOpen === true || body.isOpen === "true",
      updatedAt: new Date(),
    };

    const [settings] = await db
      .insert(donationSettingsTable)
      .values({ id: 1, ...values })
      .onConflictDoUpdate({ target: donationSettingsTable.id, set: values })
      .returning();

    res.json(settings);
  } catch (error) {
    console.error("Error updating donation settings:", error);
    res.status(500).json({ error: "Gagal menyimpan pengaturan donasi" });
  }
});

export default router;
