import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, articlesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/categories", async (_req, res) => {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      color: categoriesTable.color,
      articleCount: count(articlesTable.id),
    })
    .from(categoriesTable)
    .leftJoin(
      articlesTable,
      eq(categoriesTable.id, articlesTable.categoryId)
    )
    .groupBy(categoriesTable.id);

  res.json(rows);
});

router.post("/categories", requireAuth, async (req, res) => {
  const { name, slug, color } = req.body;
  if (!name || !slug) return res.status(400).json({ error: "name dan slug wajib diisi" });

  const [cat] = await db
    .insert(categoriesTable)
    .values({ name, slug, color: color ?? "#3B82F6" })
    .returning();

  res.status(201).json(cat);
});

export default router;
