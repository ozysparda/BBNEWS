---
name: External database schema
description: Compatibility rules for the PostgreSQL database used by the deployed API
---
The API's `POSTGRES_URL` database can contain an older schema than the current Drizzle models and is separate from Replit's managed database connection.

**Why:** The complaint migration initially targeted the wrong database and Drizzle's non-interactive push detected rename/data-loss conflicts. Treating the two databases as interchangeable caused runtime failures.

**How to apply:** Before schema work, inspect the database reached by `POSTGRES_URL`. Prefer additive, idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` migrations that preserve legacy columns and data. Never use force mode for shared production-like data without explicit approval.