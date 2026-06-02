import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable } from "@workspace/db/schema";
import { eq, desc, ilike, sql, and, count } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import slugify from "slugify";

const router = Router();

function buildArticleWithCategory() {
  return {
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
    categoryName: categoriesTable.name,
    categorySlug: categoriesTable.slug,
    categoryColor: categoriesTable.color,
  };
}

function formatArticleRow(row: any) {
  const { categoryName, categorySlug, categoryColor, ...article } = row;
  return {
    ...article,
    createdAt: article.createdAt instanceof Date ? article.createdAt.toISOString() : article.createdAt,
    updatedAt: article.updatedAt instanceof Date ? article.updatedAt.toISOString() : article.updatedAt,
    category: article.categoryId && categoryName
      ? { id: article.categoryId, name: categoryName, slug: categorySlug, color: categoryColor }
      : null,
  };
}

// Public: only published articles
router.get("/articles", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
  const offset = (page - 1) * limit;
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
  const search = req.query.search as string | undefined;

  const conditions = [eq(articlesTable.isPublished, true)];
  if (categoryId) conditions.push(eq(articlesTable.categoryId, categoryId));
  if (search) conditions.push(ilike(articlesTable.title, `%${search}%`));

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const [totalResult, rows] = await Promise.all([
    db.select({ count: count() }).from(articlesTable).where(where),
    db
      .select(buildArticleWithCategory())
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
      .where(where)
      .orderBy(desc(articlesTable.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = totalResult[0].count;
  res.json({
    articles: rows.map(formatArticleRow),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// Admin: all articles (published + drafts)
router.get("/admin/articles", requireAuth, async (req: AuthRequest, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 100));
  const offset = (page - 1) * limit;

  const [totalResult, rows] = await Promise.all([
    db.select({ count: count() }).from(articlesTable),
    db
      .select(buildArticleWithCategory())
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
      .orderBy(desc(articlesTable.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = totalResult[0].count;
  res.json({
    articles: rows.map(formatArticleRow),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// Public: featured articles
router.get("/articles/featured", async (_req, res) => {
  const rows = await db
    .select(buildArticleWithCategory())
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .where(and(eq(articlesTable.isPublished, true), eq(articlesTable.isFeatured, true)))
    .orderBy(desc(articlesTable.createdAt))
    .limit(5);

  if (rows.length === 0) {
    const latest = await db
      .select(buildArticleWithCategory())
      .from(articlesTable)
      .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
      .where(eq(articlesTable.isPublished, true))
      .orderBy(desc(articlesTable.createdAt))
      .limit(5);
    res.json(latest.map(formatArticleRow));
    return;
  }

  res.json(rows.map(formatArticleRow));
});

// Admin: stats (all articles)
router.get("/articles/stats", requireAuth, async (_req, res) => {
  const [totals, byCategory] = await Promise.all([
    db.select({
      total: sql<number>`cast(count(*) as int)`,
      published: sql<number>`cast(sum(case when ${articlesTable.isPublished} then 1 else 0 end) as int)`,
      draft: sql<number>`cast(sum(case when not ${articlesTable.isPublished} then 1 else 0 end) as int)`,
      totalViews: sql<number>`cast(coalesce(sum(${articlesTable.viewCount}), 0) as int)`,
    }).from(articlesTable),
    db.select({
      categoryName: categoriesTable.name,
      count: sql<number>`cast(count(${articlesTable.id}) as int)`,
    })
      .from(articlesTable)
      .innerJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
      .groupBy(categoriesTable.name)
      .orderBy(desc(sql`count(${articlesTable.id})`)),
  ]);

  res.json({ ...totals[0], byCategory });
});

// Public: get article by numeric ID (published only)
router.get("/articles/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [row] = await db
    .select(buildArticleWithCategory())
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .where(and(eq(articlesTable.id, id), eq(articlesTable.isPublished, true)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(formatArticleRow(row));
});

// Admin: get any article by ID (including drafts)
router.get("/admin/articles/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [row] = await db
    .select(buildArticleWithCategory())
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .where(eq(articlesTable.id, id))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(formatArticleRow(row));
});

// Public: get article by slug (only published)
router.get("/articles/:slug/slug", async (req, res) => {
  const slug = req.params.slug;
  const [row] = await db
    .select(buildArticleWithCategory())
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .where(and(eq(articlesTable.slug, slug), eq(articlesTable.isPublished, true)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(formatArticleRow(row));
});

// Public: increment view count
router.post("/articles/:id/views", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db
    .update(articlesTable)
    .set({ viewCount: sql`${articlesTable.viewCount} + 1` })
    .where(eq(articlesTable.id, id));
  res.status(204).send();
});

// Admin: create article
router.post("/articles", requireAuth, async (req: AuthRequest, res) => {
  const { title, excerpt, content, imageUrl, categoryId, isPublished, isFeatured } = req.body;
  if (!title || !excerpt || !content) {
    res.status(400).json({ error: "title, excerpt and content are required" });
    return;
  }

  const baseSlug = slugify(title, { lower: true, strict: true });
  const unique = `${baseSlug}-${Date.now()}`;

  const [article] = await db
    .insert(articlesTable)
    .values({
      title,
      slug: unique,
      excerpt,
      content,
      imageUrl: imageUrl || null,
      categoryId: categoryId || null,
      isPublished: !!isPublished,
      isFeatured: !!isFeatured,
    })
    .returning();

  const [row] = await db
    .select(buildArticleWithCategory())
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .where(eq(articlesTable.id, article.id));

  res.status(201).json(formatArticleRow(row));
});

// Admin: update article
router.put("/articles/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { title, excerpt, content, imageUrl, categoryId, isPublished, isFeatured } = req.body;

  await db
    .update(articlesTable)
    .set({
      title,
      excerpt,
      content,
      imageUrl: imageUrl || null,
      categoryId: categoryId || null,
      isPublished: !!isPublished,
      isFeatured: !!isFeatured,
      updatedAt: new Date(),
    })
    .where(eq(articlesTable.id, id));

  const [row] = await db
    .select(buildArticleWithCategory())
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .where(eq(articlesTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Article not found" });
    return;
  }
  res.json(formatArticleRow(row));
});

// Admin: delete article
router.delete("/articles/:id", requireAuth, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(articlesTable).where(eq(articlesTable.id, id));
  res.status(204).send();
});

export default router;
