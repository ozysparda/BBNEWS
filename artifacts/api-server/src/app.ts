import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Izinkan origin yang dikenal. Vercel preview (*.vercel.app) dan localhost (dev)
// juga diizinkan supaya preview deployment & pengembangan lokal tetap jalan.
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin / server-to-server (curl, webhook)
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;
    if (host === "berugaknews.vercel.app") return true;
    if (host === "berugaknews.com" || host === "www.berugaknews.com") return true;
    if (host.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) callback(null, true);
      else callback(null, false);
    },
    credentials: false,
  }),
);

// Security headers (defense in depth).
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", router);

// Serve sitemap.xml and feed.xml at root (for SEO)
app.get("/sitemap.xml", (_req, res) => {
  res.redirect(301, "/api/sitemap.xml");
});
app.get("/feed.xml", (_req, res) => {
  res.redirect(301, "/api/feed.xml");
});

export default app;
