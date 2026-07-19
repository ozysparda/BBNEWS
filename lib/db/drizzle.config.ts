import { defineConfig } from "drizzle-kit";
import path from "path";

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

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
