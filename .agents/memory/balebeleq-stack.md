---
name: BaleBeleqNews Stack
description: Tech stack and architecture conventions for the BaleBeleqNews portal
---
React 19 + Vite 7 + Tailwind 4 + wouter + shadcn/ui + TanStack Query + Express 5 + Drizzle ORM + PostgreSQL + JWT

Frontend: artifacts/balebeleq-web/ (previewPath /)
API: artifacts/api-server/ (previewPath /api)
DB schema: lib/db/src/schema/
API spec: lib/api-spec/openapi.yaml → codegen via `pnpm --filter @workspace/api-spec run codegen` (uses orval)
Generated client: lib/api-client-react/src/generated/
Generated zod: lib/api-zod/src/generated/

admins table: id, username, password (bcrypt), email, role (owner/editor/journalist/reviewer), created_at, updated_at
articles table: id, title, slug, excerpt, content, image_url, image_caption, category_id, is_published, is_featured, view_count, created_at, updated_at

**Why:** Single source of truth for future agent sessions on this project.
**How to apply:** Always reference this when working on BaleBeleqNews.
