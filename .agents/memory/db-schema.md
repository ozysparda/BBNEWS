---
name: BaleBeleq DB schema
description: Admins table column names and DB setup details
---

The `admins` table was created with column name `password` (NOT `password_hash`).
The API server's auth route uses `admin.password` to compare with bcrypt.
Tables: admins, categories, articles — all in PostgreSQL via Drizzle ORM.

**Why:** The schema was seeded directly via SQL matching the original repo structure,
not via Drizzle's own column naming convention (which would use `passwordHash`).
