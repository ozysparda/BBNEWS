import { Router } from "express";
import { db } from "@workspace/db";
import { complaintsTable, activityLogTable, adminsTable, blockedUsersTable } from "@workspace/db/schema";
import { eq, desc, ilike, sql, and, count, or } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import type { Request } from "express";

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"] as string | undefined;
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip || "unknown";
}

function generateComplaintNumber(): string {
  const year = new Date().getFullYear();
  const randomNum = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `BGK-${year}-${randomNum}`;
}

function formatComplaintDates(complaint: any) {
  return {
    ...complaint,
    createdAt: complaint.createdAt instanceof Date ? complaint.createdAt.toISOString() : complaint.createdAt,
    updatedAt: complaint.updatedAt instanceof Date ? complaint.updatedAt.toISOString() : complaint.updatedAt,
  };
}

function formatPublicComplaint(complaint: any) {
  const formatted = formatComplaintDates(complaint);
  return {
    id: formatted.id,
    complaintNumber: formatted.complaintNumber,
    status: formatted.status,
    createdAt: formatted.createdAt,
    updatedAt: formatted.updatedAt,
  };
}

async function isUserBlocked(ipAddress: string, email: string, deviceFingerprint?: string): Promise<boolean> {
  const blocked = await db
    .select()
    .from(blockedUsersTable)
    .where(
      and(
        eq(blockedUsersTable.isActive, "true"),
        or(
          and(eq(blockedUsersTable.blockType, "ip"), eq(blockedUsersTable.blockValue, ipAddress)),
          and(eq(blockedUsersTable.blockType, "email"), eq(blockedUsersTable.blockValue, email)),
          deviceFingerprint ? and(eq(blockedUsersTable.blockType, "device_fingerprint"), eq(blockedUsersTable.blockValue, deviceFingerprint)) : undefined
        )
      )
    )
    .limit(1);
  return blocked.length > 0;
}

const router = Router();

// Public: Submit complaint
router.post("/complaints", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      category,
      title,
      description,
      photoUrl,
      videoUrl,
      pdfUrl,
      latitude,
      longitude,
      address,
      city,
      province,
      country,
      deviceName,
      deviceType,
      operatingSystem,
      browser,
      browserVersion,
      screenResolution,
      timezone,
      localTime,
      language,
      deviceFingerprint,
      agreementAccepted,
      // Backward-compatible compact payload used by the homepage widget.
      content,
      terms,
      location,
    } = req.body;

    const compactPayload = Boolean(content);
    const compactLocation =
      typeof location === "string"
        ? location.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
        : null;
    const normalizedFullName = fullName || "Pelapor masyarakat";
    const normalizedPhoneNumber = phoneNumber || "Tidak disertakan";
    const normalizedCategory = category || "Lainnya";
    const normalizedTitle = title || "Aduan masyarakat";
    const normalizedDescription = description || content;
    const normalizedAgreement = agreementAccepted === "true" || terms === true;
    const normalizedLatitude = latitude ?? (compactLocation ? Number(compactLocation[1]) : null);
    const normalizedLongitude = longitude ?? (compactLocation ? Number(compactLocation[2]) : null);

    // Validation
    if (
      !email ||
      !normalizedDescription ||
      !normalizedAgreement ||
      (!compactPayload && (!fullName || !phoneNumber || !category || !title || agreementAccepted !== "true"))
    ) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const ipAddress = getClientIp(req);

    // Check if user is blocked
    const blocked = await isUserBlocked(ipAddress, email, deviceFingerprint);
    if (blocked) {
      res.status(403).json({ error: "User or IP is blocked" });
      return;
    }

    const complaintNumber = generateComplaintNumber();

    const [complaint] = await db
      .insert(complaintsTable)
      .values({
        complaintNumber,
        fullName: normalizedFullName,
        email: email.toLowerCase(),
        content: normalizedDescription,
        terms: normalizedAgreement,
        phoneNumber: normalizedPhoneNumber,
        category: normalizedCategory,
        title: normalizedTitle,
        description: normalizedDescription,
        photoUrl: photoUrl || null,
        videoUrl: videoUrl || null,
        pdfUrl: pdfUrl || null,
        status: "pending",
        latitude: normalizedLatitude,
        longitude: normalizedLongitude,
        address: address || null,
        city: city || null,
        province: province || null,
        country: country || null,
        deviceName: deviceName || null,
        deviceType: deviceType || null,
        operatingSystem: operatingSystem || null,
        browser: browser || null,
        browserVersion: browserVersion || null,
        screenResolution: screenResolution || null,
        timezone: timezone || null,
        localTime: localTime || null,
        ipAddress,
        userAgent: req.headers["user-agent"] || null,
        language: language || null,
        deviceFingerprint: deviceFingerprint || null,
        location: location || null,
        agreementAccepted: "true",
      })
      .returning();

    res.status(201).json(formatPublicComplaint(complaint));
  } catch (error) {
    console.error("Error submitting complaint:", error);
    res.status(500).json({ error: "Failed to submit complaint" });
  }
});

// Admin: Get all complaints
router.get("/admin/complaints", requireAuth, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(complaintsTable.complaintNumber, `%${search}%`),
          ilike(complaintsTable.fullName, `%${search}%`),
          ilike(complaintsTable.email, `%${search}%`),
          ilike(complaintsTable.title, `%${search}%`)
        )
      );
    }
    if (status) {
      conditions.push(eq(complaintsTable.status, status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, rows] = await Promise.all([
      db.select({ count: count() }).from(complaintsTable).where(where),
      db
        .select()
        .from(complaintsTable)
        .where(where)
        .orderBy(desc(complaintsTable.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalResult[0].count;
    res.json({
      complaints: rows.map(formatComplaintDates),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

// Admin: Get single complaint
router.get("/admin/complaints/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [complaint] = await db
      .select()
      .from(complaintsTable)
      .where(eq(complaintsTable.id, id))
      .limit(1);

    if (!complaint) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }

    res.json(formatComplaintDates(complaint));
  } catch (error) {
    console.error("Error fetching complaint:", error);
    res.status(500).json({ error: "Failed to fetch complaint" });
  }
});

// Admin: Update complaint status
router.patch("/admin/complaints/:id/status", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { status, assignedOfficer } = req.body;
    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }

    await db
      .update(complaintsTable)
      .set({
        status,
        assignedOfficer: assignedOfficer || null,
        updatedAt: new Date(),
      })
      .where(eq(complaintsTable.id, id));

    const [complaint] = await db
      .select()
      .from(complaintsTable)
      .where(eq(complaintsTable.id, id))
      .limit(1);

    if (!complaint) {
      res.status(404).json({ error: "Complaint not found" });
      return;
    }

    res.json(formatComplaintDates(complaint));
  } catch (error) {
    console.error("Error updating complaint:", error);
    res.status(500).json({ error: "Failed to update complaint" });
  }
});

// Admin: Delete complaint
router.delete("/admin/complaints/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.delete(complaintsTable).where(eq(complaintsTable.id, id));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting complaint:", error);
    res.status(500).json({ error: "Failed to delete complaint" });
  }
});

// Admin: Block user
router.post("/admin/blocked-users", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { blockType, blockValue, reason } = req.body;
    if (!blockType || !blockValue) {
      res.status(400).json({ error: "blockType and blockValue are required" });
      return;
    }

    const [admin] = await db.select({ username: adminsTable.username }).from(adminsTable).where(eq(adminsTable.id, req.adminId!)).limit(1);

    const [blocked] = await db
      .insert(blockedUsersTable)
      .values({
        blockType,
        blockValue,
        reason: reason || null,
        isActive: "true",
        createdBy: admin?.username || "admin",
      })
      .returning();

    res.status(201).json(blocked);
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ error: "Failed to block user" });
  }
});

// Admin: List blocked users
router.get("/admin/blocked-users", requireAuth, async (req: AuthRequest, res) => {
  try {
    const blocked = await db
      .select()
      .from(blockedUsersTable)
      .where(eq(blockedUsersTable.isActive, "true"))
      .orderBy(desc(blockedUsersTable.createdAt));

    res.json(blocked);
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    res.status(500).json({ error: "Failed to fetch blocked users" });
  }
});

// Admin: Unblock user
router.delete("/admin/blocked-users/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db
      .update(blockedUsersTable)
      .set({ isActive: "false" })
      .where(eq(blockedUsersTable.id, id));

    res.status(204).send();
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

export default router;