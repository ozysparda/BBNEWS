import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, articlesTable } from "@workspace/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/categories", async (_req, res) => {
  const categories = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      color: categoriesTable.color,
      articleCount: sql<number>`cast(count(${articlesTable.id}) as int)`,
    })
    .from(categoriesTable)
    .leftJoin(articlesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id)
    .orderBy(categoriesTable.name);

  res.json(categories);
});

router.post("/categories", requireAuth, async (req, res) => {
  const { name, slug, color } = req.body;
  if (!name || !slug || !color) {
    res.status(400).json({ error: "name, slug, and color are required" });
    return;
  }

  const [category] = await db
    .insert(categoriesTable)
    .values({ name, slug, color })
    .returning();

  res.status(201).json({ ...category, articleCount: 0 });
});

export default router;
