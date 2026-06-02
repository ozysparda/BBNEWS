import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminsTable, articlesTable, activityLogTable } from "@workspace/db/schema";
import { eq, desc, count, max, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

router.get("/admin/profile", requireAuth, async (req: AuthRequest, res) => {
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, req.adminId!)).limit(1);
  if (!admin) { res.status(404).json({ error: "Not found" }); return; }

  const [stats] = await db
    .select({
      articleCount: count(activityLogTable.id),
      lastUpload: max(activityLogTable.createdAt),
    })
    .from(activityLogTable)
    .where(eq(activityLogTable.adminId, req.adminId!));

  res.json({
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    articleCount: Number(stats?.articleCount ?? 0),
    lastUpload: stats?.lastUpload ?? null,
    createdAt: admin.createdAt,
  });
});

router.put("/admin/profile/password", requireAuth, async (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "Password baru minimal 6 karakter" });
    return;
  }

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, req.adminId!)).limit(1);
  if (!admin) { res.status(404).json({ error: "User not found" }); return; }

  const valid = await bcrypt.compare(currentPassword, admin.password);
  if (!valid) { res.status(400).json({ error: "Password saat ini salah" }); return; }

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.update(adminsTable).set({ password: hashed, updatedAt: new Date() }).where(eq(adminsTable.id, req.adminId!));
  res.json({ success: true });
});

router.put("/admin/profile", requireAuth, async (req: AuthRequest, res) => {
  const { email } = req.body;
  const [updated] = await db
    .update(adminsTable)
    .set({ email: email || null, updatedAt: new Date() })
    .where(eq(adminsTable.id, req.adminId!))
    .returning();
  res.json({ id: updated.id, username: updated.username, email: updated.email, role: updated.role });
});

router.get("/admin/activity-log", requireAuth, async (req: AuthRequest, res) => {
  const [me] = await db.select().from(adminsTable).where(eq(adminsTable.id, req.adminId!)).limit(1);
  if (!me) { res.status(401).json({ error: "Unauthorized" }); return; }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
  const offset = (page - 1) * limit;

  const adminIdFilter = me.role === "owner" ? undefined : req.adminId!;
  const whereClause = adminIdFilter ? eq(activityLogTable.adminId, adminIdFilter) : undefined;

  const logs = await db
    .select()
    .from(activityLogTable)
    .where(whereClause)
    .orderBy(desc(activityLogTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(activityLogTable)
    .where(whereClause);

  res.json({ logs, total: Number(total), page, limit });
});

export default router;
