import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  const users = await db.select().from(adminsTable).where(eq(adminsTable.username, "admin"));
  console.log("Admin users found:", users.length);
  for (const u of users) {
    const ok = await bcrypt.compare("admin123", u.password);
    console.log({
      id: u.id,
      username: u.username,
      role: u.role,
      email: u.email,
      createdAt: u.createdAt,
      passwordLength: u.password.length,
      passwordPrefix: u.password.slice(0, 20),
      passwordCorrect: ok,
    });
  }

  const all = await db.select({ username: adminsTable.username, role: adminsTable.role }).from(adminsTable);
  console.log("All users:", all);
  process.exit(0);
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
