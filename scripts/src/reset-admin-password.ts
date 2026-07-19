import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function main() {
  const [username, password, email] = process.argv.slice(2);

  if (!username || !password) {
    console.error("Usage: pnpm --filter @workspace/scripts exec tsx src/reset-admin-password.ts <username> <password> [email]");
    process.exit(1);
  }

  const [existing] = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
  const hashed = await bcrypt.hash(password, 10);

  if (existing) {
    await db
      .update(adminsTable)
      .set({ password: hashed, role: "owner", updatedAt: new Date() })
      .where(eq(adminsTable.id, existing.id));
    console.log(`✅ Password untuk "${username}" di-reset. Role di-set menjadi owner.`);
  } else {
    const [created] = await db
      .insert(adminsTable)
      .values({ username, password: hashed, role: "owner", email: email || null })
      .returning();
    console.log(`✅ Akun owner baru dibuat: ${created.username} (role: ${created.role})`);
  }

  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
