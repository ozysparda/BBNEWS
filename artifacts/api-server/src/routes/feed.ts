import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SITE_URL = "https://berugaknews.vercel.app";

router.get("/feed.xml", async (_req, res) => {
  try {
    const articles = await db
      .select()
      .from(articlesTable)
      .where(eq(articlesTable.isPublished, true))
      .orderBy(articlesTable.createdAt)
      .limit(50);

    const items = articles.map((a) => {
      const pubDate = a.createdAt ? new Date(a.createdAt).toUTCString() : "";
      return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${SITE_URL}/berita/${a.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/berita/${a.slug}</guid>
      <description><![CDATA[${a.excerpt || ""}]]></description>
      <pubDate>${pubDate}</pubDate>
      ${a.imageUrl ? `<enclosure url="${a.imageUrl}" type="image/jpeg" />` : ""}
    </item>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
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

    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    res.status(500).send("Error generating feed");
  }
});

export default router;