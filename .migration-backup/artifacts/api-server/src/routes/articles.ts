import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable } from "@workspace/db";
import { eq, desc, ilike, and, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

router.get("/articles", async (req, res) => {
  const page = parseInt(String(req.query.page ?? "1"));
  const limit = parseInt(String(req.query.limit ?? "10"));
  const categoryId = req.query.categoryId ? parseInt(String(req.query.categoryId)) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;
  const offset = (page - 1) * limit;

  const conditions = [eq(articlesTable.isPublished, true)];
  if (categoryId) conditions.push(eq(articlesTable.categoryId, categoryId));
  if (search) conditions.push(ilike(articlesTable.title, `%${search}%`));

  const where = and(...conditions);

  const [articles, totalResult] = await Promise.all([
    db
      .select({
        id: articlesTable.id,
        title: articlesTable.title,
        slug: articlesTable.slug,
        excerpt: articlesTable.excerpt,
        content: articlesTable.content,
        imageUrl: articlesTable.imageUrl,
        categoryId: articlesTable.categoryId,
        isPublished: articlesTable.isPublished,
        isFeatured: articlesTable.isFeatured,
        viewCount: articlesTable.viewCount,
        createdAt: articlesTable.createdAt,
        updatedAt: articlesTable.updatedAt,
        category: {
          id: categoriesTable.id,
          name: categoriesTable.name,
          slug: categoriesTable.slug,
          color: categoriesTable.color,
        },
      })
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
      .where(where)
      .orderBy(desc(articlesTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(articlesTable).where(where),
  ]);

  const total = totalResult[0]?.count ?? 0;

  res.json({
    articles,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/articles/featured", async (_req, res) => {
  const articles = await db
    .select({
      id: articlesTable.id,
      title: articlesTable.title,
      slug: articlesTable.slug,
      excerpt: articlesTable.excerpt,
      content: articlesTable.content,
      imageUrl: articlesTable.imageUrl,
      categoryId: articlesTable.categoryId,
      isPublished: articlesTable.isPublished,
      isFeatured: articlesTable.isFeatured,
      viewCount: articlesTable.viewCount,
      createdAt: articlesTable.createdAt,
      updatedAt: articlesTable.updatedAt,
      category: {
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        color: categoriesTable.color,
      },
    })
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .where(and(eq(articlesTable.isPublished, true), eq(articlesTable.isFeatured, true)))
    .orderBy(desc(articlesTable.createdAt))
    .limit(6);

  res.json(articles);
});

router.get("/articles/stats", requireAuth, async (_req, res) => {
  const [totalResult, publishedResult, viewsResult, byCategoryResult] = await Promise.all([
    db.select({ count: count() }).from(articlesTable),
    db.select({ count: count() }).from(articlesTable).where(eq(articlesTable.isPublished, true)),
    db.select({ total: sql<number>`sum(${articlesTable.viewCount})` }).from(articlesTable),
    db
      .select({
        categoryName: categoriesTable.name,
        count: count(),
      })
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
      .groupBy(categoriesTable.name),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const published = publishedResult[0]?.count ?? 0;

  res.json({
    total,
    published,
    draft: total - published,
    totalViews: viewsResult[0]?.total ?? 0,
    byCategory: byCategoryResult.map((r) => ({
      categoryName: r.categoryName ?? "Tanpa Kategori",
      count: r.count,
    })),
  });
});

router.get("/articles/:id/slug", async (req, res) => {
  const slug = req.params.id;
  const [article] = await db
    .select({
      id: articlesTable.id,
      title: articlesTable.title,
      slug: articlesTable.slug,
      excerpt: articlesTable.excerpt,
      content: articlesTable.content,
      imageUrl: articlesTable.imageUrl,
      categoryId: articlesTable.categoryId,
      isPublished: articlesTable.isPublished,
      isFeatured: articlesTable.isFeatured,
      viewCount: articlesTable.viewCount,
      createdAt: articlesTable.createdAt,
      updatedAt: articlesTable.updatedAt,
      category: {
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        color: categoriesTable.color,
      },
    })
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .where(and(eq(articlesTable.slug, slug), eq(articlesTable.isPublished, true)));

  if (!article) return res.status(404).json({ error: "Artikel tidak ditemukan" });
  res.json(article);
});

router.get("/articles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

  const [article] = await db
    .select({
      id: articlesTable.id,
      title: articlesTable.title,
      slug: articlesTable.slug,
      excerpt: articlesTable.excerpt,
      content: articlesTable.content,
      imageUrl: articlesTable.imageUrl,
      categoryId: articlesTable.categoryId,
      isPublished: articlesTable.isPublished,
      isFeatured: articlesTable.isFeatured,
      viewCount: articlesTable.viewCount,
      createdAt: articlesTable.createdAt,
      updatedAt: articlesTable.updatedAt,
      category: {
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        color: categoriesTable.color,
      },
    })
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .where(eq(articlesTable.id, id));

  if (!article) return res.status(404).json({ error: "Artikel tidak ditemukan" });
  res.json(article);
});

router.post("/articles/:id/views", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

  await db
    .update(articlesTable)
    .set({ viewCount: sql`${articlesTable.viewCount} + 1` })
    .where(eq(articlesTable.id, id));

  res.status(204).send();
});

router.post("/articles", requireAuth, async (req, res) => {
  const { title, excerpt, content, imageUrl, categoryId, isPublished, isFeatured } = req.body;
  if (!title || !excerpt || !content) {
    return res.status(400).json({ error: "title, excerpt, dan content wajib diisi" });
  }

  let slug = toSlug(title);
  const existing = await db.select({ id: articlesTable.id }).from(articlesTable).where(eq(articlesTable.slug, slug));
  if (existing.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }

  const [article] = await db
    .insert(articlesTable)
    .values({
      title,
      slug,
      excerpt,
      content,
      imageUrl: imageUrl ?? null,
      categoryId: categoryId ?? null,
      isPublished: Boolean(isPublished),
      isFeatured: Boolean(isFeatured),
    })
    .returning();

  res.status(201).json(article);
});

router.put("/articles/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

  const { title, excerpt, content, imageUrl, categoryId, isPublished, isFeatured } = req.body;

  const [article] = await db
    .update(articlesTable)
    .set({
      title,
      excerpt,
      content,
      imageUrl: imageUrl ?? null,
      categoryId: categoryId ?? null,
      isPublished: Boolean(isPublished),
      isFeatured: Boolean(isFeatured),
      updatedAt: new Date(),
    })
    .where(eq(articlesTable.id, id))
    .returning();

  if (!article) return res.status(404).json({ error: "Artikel tidak ditemukan" });
  res.json(article);
});

router.delete("/articles/:id", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "ID tidak valid" });

  await db.delete(articlesTable).where(eq(articlesTable.id, id));
  res.status(204).send();
});

export default router;
