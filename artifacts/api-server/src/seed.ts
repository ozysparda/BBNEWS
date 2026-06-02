import { db } from "@workspace/db";
import { adminsTable, categoriesTable, articlesTable } from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const DEFAULT_PASSWORD = "admin123";

async function seed() {
  console.log("🌱 Seeding database...");

  const existing = await db.select().from(adminsTable).where(eq(adminsTable.username, "admin")).limit(1);
  if (existing.length === 0) {
    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await db.insert(adminsTable).values({
      username: "admin",
      password: hashed,
      email: "admin@balebeleq.local",
    });
    console.log("✅ Admin user created: admin / admin123");
  } else {
    console.log("ℹ️ Admin user already exists");
  }

  const existingCategories = await db.select().from(categoriesTable);
  if (existingCategories.length === 0) {
    await db.insert(categoriesTable).values([
      { name: "Politik", slug: "politik", color: "#ef4444" },
      { name: "Ekonomi", slug: "ekonomi", color: "#f59e0b" },
      { name: "Sosial", slug: "sosial", color: "#10b981" },
      { name: "Budaya", slug: "budaya", color: "#8b5cf6" },
      { name: "Olahraga", slug: "olahraga", color: "#3b82f6" },
      { name: "Teknologi", slug: "teknologi", color: "#06b6d4" },
    ]);
    console.log("✅ Default categories created");
  } else {
    console.log("ℹ️ Categories already exist");
  }

  console.log("🎉 Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
