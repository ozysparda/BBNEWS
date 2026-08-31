import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db/schema";
import { eq, ne } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

async function requireOwner(req: AuthRequest, res: any): Promise<boolean> {
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, req.adminId!)).limit(1);
  if (!admin || admin.role !== "owner") {
    res.status(403).json({ error: "Owner access required" });
    return false;
  }
  return true;
}

function formatUser(admin: any) {
  return { id: admin.id, username: admin.username, email: admin.email, role: admin.role };
}

router.get("/admin/users", requireAuth, async (req: AuthRequest, res) => {
  if (!(await requireOwner(req, res))) return;
  const users = await db.select().from(adminsTable).orderBy(adminsTable.createdAt);
  res.json(users.map(formatUser));
});

router.post("/admin/users", requireAuth, async (req: AuthRequest, res) => {
  if (!(await requireOwner(req, res))) return;

  const { username, password, email, role } = req.body;
  if (!username || !password || !role) {
    res.status(400).json({ error: "username, password and role are required" });
    return;
  }

  const validRoles = ["owner", "editor", "journalist", "reviewer"];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role. Must be: owner, editor, journalist, reviewer" });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(adminsTable)
    .values({ username, password: hashedPassword, email: email || null, role })
    .returning();

  res.status(201).json(formatUser(created));
});

router.put("/admin/users/:id", requireAuth, async (req: AuthRequest, res) => {
  if (!(await requireOwner(req, res))) return;

  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  const { username, password, email, role } = req.body;

  const validRoles = ["owner", "editor", "journalist", "reviewer"];
  if (role && !validRoles.includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }

  const updateData: any = { updatedAt: new Date() };
  if (username) updateData.username = username;
  if (email !== undefined) updateData.email = email || null;
  if (role) updateData.role = role;
  if (password) updateData.password = await bcrypt.hash(password, 10);

  const [updated] = await db.update(adminsTable).set(updateData).where(eq(adminsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }

  res.json(formatUser(updated));
});

router.delete("/admin/users/:id", requireAuth, async (req: AuthRequest, res) => {
  if (!(await requireOwner(req, res))) return;

  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(404).json({ error: "Not found" }); return; }

  if (id === req.adminId) {
    res.status(400).json({ error: "Cannot delete yourself" });
    return;
  }

  await db.delete(adminsTable).where(eq(adminsTable.id, id));
  res.status(204).send();
});

export default router;
