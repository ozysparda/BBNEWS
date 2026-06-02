import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminsTable, categoriesTable, articlesTable } from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("admin123", 10);
  await db
    .insert(adminsTable)
    .values({ username: "admin", passwordHash, email: "admin@balebeleq.com" })
    .onConflictDoNothing();

  const cats = await db
    .insert(categoriesTable)
    .values([
      { name: "Berita Lokal", slug: "berita-lokal", color: "#EF4444" },
      { name: "Pemerintahan", slug: "pemerintahan", color: "#3B82F6" },
      { name: "Ekonomi", slug: "ekonomi", color: "#10B981" },
      { name: "Olahraga", slug: "olahraga", color: "#F59E0B" },
      { name: "Budaya", slug: "budaya", color: "#8B5CF6" },
    ])
    .onConflictDoNothing()
    .returning();

  if (cats.length > 0) {
    await db
      .insert(articlesTable)
      .values([
        {
          title: "Selamat Datang di BaleBeleqNews",
          slug: "selamat-datang-di-balebeleqnews",
          excerpt: "Portal berita terpercaya untuk masyarakat, menyajikan informasi terkini dan terpercaya.",
          content:
            "<p>BaleBeleqNews hadir sebagai portal berita terpercaya untuk masyarakat. Kami berkomitmen menyajikan informasi yang akurat, berimbang, dan bertanggung jawab.</p><p>Temukan berita terkini seputar daerah, pemerintahan, ekonomi, olahraga, dan budaya hanya di BaleBeleqNews.</p>",
          categoryId: cats[0]?.id ?? null,
          isPublished: true,
          isFeatured: true,
        },
        {
          title: "Pembangunan Infrastruktur Daerah Terus Berlanjut",
          slug: "pembangunan-infrastruktur-daerah",
          excerpt: "Pemerintah daerah terus mendorong percepatan pembangunan infrastruktur untuk meningkatkan konektivitas.",
          content:
            "<p>Pemerintah daerah terus mendorong percepatan pembangunan infrastruktur untuk meningkatkan konektivitas dan kesejahteraan masyarakat. Program ini mencakup perbaikan jalan, jembatan, dan fasilitas umum.</p>",
          categoryId: cats[1]?.id ?? null,
          isPublished: true,
          isFeatured: true,
        },
        {
          title: "UMKM Lokal Semakin Berkembang di Era Digital",
          slug: "umkm-lokal-era-digital",
          excerpt: "Para pelaku UMKM di daerah semakin memanfaatkan platform digital untuk memasarkan produk mereka.",
          content:
            "<p>Para pelaku UMKM di daerah semakin memanfaatkan platform digital untuk memasarkan produk mereka. Dengan dukungan pemerintah dan komunitas, UMKM lokal terus bertumbuh dan berinovasi.</p>",
          categoryId: cats[2]?.id ?? null,
          isPublished: true,
          isFeatured: false,
        },
      ])
      .onConflictDoNothing();
  }

  console.log("Seeding selesai!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
