import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "balebeleq-secret-change-in-prod";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token tidak ditemukan" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    (req as any).adminId = payload.id;
    (req as any).adminUsername = payload.username;
    next();
  } catch {
    return res.status(401).json({ error: "Token tidak valid atau sudah expired" });
  }
}
