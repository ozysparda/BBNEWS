import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "balebeleq-secret-change-in-prod";

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username dan password wajib diisi" });
  }

  const [admin] = await db
    .select()
    .from(adminsTable)
    .where(eq(adminsTable.username, username));

  if (!admin) {
    return res.status(401).json({ error: "Username atau password salah" });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Username atau password salah" });
  }

  const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({
    token,
    user: { id: admin.id, username: admin.username, email: admin.email },
  });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const adminId = (req as any).adminId;
  const [admin] = await db
    .select({ id: adminsTable.id, username: adminsTable.username, email: adminsTable.email })
    .from(adminsTable)
    .where(eq(adminsTable.id, adminId));

  if (!admin) return res.status(404).json({ error: "User tidak ditemukan" });
  res.json(admin);
});

export default router;
