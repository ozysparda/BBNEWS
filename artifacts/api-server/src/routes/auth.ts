import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router = Router();

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required but was not provided.");
  }
  return secret;
}

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign({ id: admin.id, username: admin.username }, getJwtSecret(), { expiresIn: "7d" });
  res.json({
    token,
    user: { id: admin.id, username: admin.username, email: admin.email, role: admin.role }
  });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.id, req.adminId!)).limit(1);
  if (!admin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ id: admin.id, username: admin.username, email: admin.email, role: admin.role });
});

export default router;
