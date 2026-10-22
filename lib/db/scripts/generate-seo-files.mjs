import { Client } from "pg";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://berugaknews.vercel.app";

function getDatabaseUrl() {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || null;
}

async function main() {
  const url = getDatabaseUrl();
  if (!url) {
    console.log("[generate-seo] Lewati - tidak ada database URL.");
    return;
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    // Sitemap
    const articlesRes = await client.query(
      "SELECT slug, updated_at, created_at FROM articles WHERE is_published = true ORDER BY created_at DESC"
    );
    const categoriesRes = await client.query("SELECT slug FROM categories");

    const urls = [];
    urls.push(`<url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`);
    urls.push(`<url><loc>${SITE_URL}/cari</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`);
    urls.push(`<url><loc>${SITE_URL}/donasi</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`);

    for (const cat of categoriesRes.rows) {
      urls.push(`<url><loc>${SITE_URL}/kategori/${cat.slug}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>`);
    }
    for (const art of articlesRes.rows) {
      const lastmod = art.updated_at || art.created_at;
      const lastmodStr = lastmod ? new Date(lastmod).toISOString().split("T")[0] : "";
      urls.push(
        `<url><loc>${SITE_URL}/berita/${art.slug}</loc>${lastmodStr ? `<lastmod>${lastmodStr}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.9</priority></url>`
      );
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
    await writeFile(path.join(process.argv[2], "sitemap.xml"), sitemap, "utf8");
    console.log(`[generate-seo] sitemap.xml ditulis (${urls.length} URL).`);

    // RSS Feed
    const feedArticles = await client.query(
      "SELECT title, slug, excerpt, image_url, created_at FROM articles WHERE is_published = true ORDER BY created_at DESC LIMIT 50"
    );
    const items = feedArticles.rows.map((a) => {
      const pubDate = a.created_at ? new Date(a.created_at).toUTCString() : "";
      return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${SITE_URL}/berita/${a.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/berita/${a.slug}</guid>
      <description><![CDATA[${a.excerpt || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
      ${a.image_url ? `<enclosure url="${a.image_url}" type="image/jpeg" />` : ""}
    </item>`;
    });

    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BerugakNews</title>
    <link>${SITE_URL}</link>
    <description>Portal Berita Lombok - Cepat, Akurat, Berimbang, Terpercaya</description>
    <language>id-ID</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items.join("\n")}
  </channel>
</rss>`;
    await writeFile(path.join(process.argv[2], "feed.xml"), feed, "utf8");
    console.log(`[generate-seo] feed.xml ditulis (${items.length} artikel).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[generate-seo] Gagal:", err?.message || err);
  // Don't fail the build
});