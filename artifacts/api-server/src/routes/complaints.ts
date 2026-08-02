import { Router } from "express";
import { db } from "@workspace/db";
import { complaintsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import type { Request } from "express";

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"] as string | undefined;
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.ip || "unknown";
}

function formatComplaintDates(complaint: any) {
  return {
    ...complaint,
    createdAt: complaint.createdAt instanceof Date ? complaint.createdAt.toISOString() : complaint.createdAt,
    updatedAt: complaint.updatedAt instanceof Date ? complaint.updatedAt.toISOString() : complaint.updatedAt,
  };
}

const router = Router();

// Public: submit a complaint/report
router.post("/complaints", async (req, res) => {
  const { email, content, terms } = req.body;
  if (!email || !content) {
    res.status(400).json({ error: "email and content are required" });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    res.status(400).json({ error: "Content cannot be empty" });
    return;
  }
  if (!terms) {
    res.status(400).json({ error: "You must accept the terms" });
    return;
  }

  const [complaint] = await db
    .insert(complaintsTable)
    .values({
      email: email.trim().toLowerCase(),
      content: trimmedContent,
      terms: true,
      status: "pending",
      ipAddress: getClientIp(req),
      userAgent: req.headers["user-agent"] || null,
      location: req.body.location || null,
    })
    .returning({
      id: complaintsTable.id,
      email: complaintsTable.email,
      content: complaintsTable.content,
      status: complaintsTable.status,
      createdAt: complaintsTable.createdAt,
      updatedAt: complaintsTable.updatedAt,
    });
  res.status(201).json(formatComplaintDates(complaint));
});

// Admin: list all complaints
router.get("/admin/complaints", requireAuth, async (req: AuthRequest, res) => {
  const rows = await db
    .select()
    .from(complaintsTable)
    .orderBy(desc(complaintsTable.createdAt));
  res.json(rows.map(formatComplaintDates));
});

// Admin: update complaint status
router.put("/admin/complaints/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { status } = req.body;
  const allowed = ["pending", "in-review", "resolved", "rejected"];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  await db
    .update(complaintsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(complaintsTable.id, id));
  const [row] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id)).limit(1);
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(formatComplaintDates(row));
});

// Admin: delete a complaint
router.delete("/admin/complaints/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(complaintsTable).where(eq(complaintsTable.id, id));
  res.status(204).send();
});

export default router;
