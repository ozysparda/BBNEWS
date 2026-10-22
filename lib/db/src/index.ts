import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function getDatabaseUrl(): string {
  const url =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Database URL is required. Set POSTGRES_URL (Vercel Postgres), POSTGRES_PRISMA_URL, or DATABASE_URL.",
    );
  }

  return url;
}

function isLocalDatabase(url: string): boolean {
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("::1")
  );
}

const databaseUrl = getDatabaseUrl();

export const pool = new Pool({
  connectionString: databaseUrl,
  // Vercel Postgres (and most managed PostgreSQL providers) require SSL.
  // Local development usually does not.
  ...(isLocalDatabase(databaseUrl)
    ? {}
    : { ssl: { rejectUnauthorized: false } }),
});

export const db = drizzle(pool, { schema });

export * from "./schema";
