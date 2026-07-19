import { Router, type IRouter, type Response } from "express";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

/**
 * POST /api/storage/upload-token
 *
 * Generate a temporary Vercel Blob client token so the browser can upload
 * a file directly to Vercel Blob without touching the server with the file bytes.
 */
router.post("/storage/upload-token", requireAuth, async (req: AuthRequest, res: Response) => {
  const { name } = req.body || {};
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "Missing or invalid file name" });
    return;
  }

  const rwToken = getBlobToken();
  if (!rwToken) {
    req.log.error("BLOB_READ_WRITE_TOKEN is not configured");
    res.status(500).json({ error: "Storage is not configured" });
    return;
  }

  try {
    const pathname = `uploads/${Date.now()}-${name}`;
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: rwToken,
      pathname,
    });

    res.json({ token: clientToken, pathname });
  } catch (error) {
    req.log.error({ err: error }, "Error generating Vercel Blob client token");
    res.status(500).json({ error: "Failed to generate upload token" });
  }
});

export default router;
