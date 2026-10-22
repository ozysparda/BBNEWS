import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SITE_URL = "https://berugaknews.vercel.app";

router.get("/sitemap.xml", async (_req, res) => {
  try {
    const articles = await db
      .select({ slug: articlesTable.slug, updatedAt: articlesTable.updatedAt, createdAt: articlesTable.createdAt })
      .from(articlesTable)
      .where(eq(articlesTable.isPublished, true));

    const categories = await db
      .select({ slug: categoriesTable.slug })
      .from(categoriesTable);

    const urls: string[] = [];

    // Static pages
    urls.push(`<url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`);
    urls.push(`<url><loc>${SITE_URL}/cari</loc><changefreq>weekly</changefreq><priority>0.5</priority></url>`);
    urls.push(`<url><loc>${SITE_URL}/donasi</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`);

    // Categories
    for (const cat of categories) {
      urls.push(`<url><loc>${SITE_URL}/kategori/${cat.slug}</loc><changefreq>daily</changefreq><priority>0.7</priority></url>`);
    }

    // Articles
    for (const art of articles) {
      const lastmod = art.updatedAt || art.createdAt;
      const lastmodStr = lastmod ? new Date(lastmod).toISOString().split("T")[0] : "";
      urls.push(
        `<url><loc>${SITE_URL}/berita/${art.slug}</loc>${lastmodStr ? `<lastmod>${lastmodStr}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.9</priority></url>`,
      );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
});

export default router;