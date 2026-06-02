---
name: BaleBeleq stack
description: Key lessons from migrating BaleBeleqNews to the Replit pnpm workspace
---

# BaleBeleq Stack Notes

## Architecture
- Frontend: `artifacts/balebeleq-web/` — React 19 + Vite 7 + Tailwind 4 + wouter + shadcn/ui + TanStack Query
- API: `artifacts/api-server/` — Express 5 + Drizzle ORM + PostgreSQL + JWT auth
- DB schema: `lib/db/src/schema/` — admins, categories, articles tables

## Key decisions

### Logo / public assets with base path
The Vite config uses `base: basePath` (not root `/`). Using `import logoImg from "/logo.png"` breaks because Vite treats it as an absolute URL, not a public asset.

**Correct pattern:**
```tsx
const logoImg = `${import.meta.env.BASE_URL}logo.png`;
```

### DB seeding
Can't use bcryptjs directly in the `code_execution` sandbox (not in workspace root package.json). Use `node -e "require('/path/to/bcryptjs/index.js').hash(...)"` to generate hash, then seed via `executeSql()`.

**Why:** The sandbox runs in the workspace root; bcryptjs is only installed in `artifacts/api-server/node_modules/`.

### Missing API server packages
The base scaffold doesn't include `bcryptjs`, `jsonwebtoken`, `slugify` — these must be added with `pnpm add` in `artifacts/api-server/`.

### setAuthTokenGetter
Must call `setAuthTokenGetter(() => localStorage.getItem("admin_token"))` from `@workspace/api-client-react` in App.tsx before any API calls that need auth headers.

### Admin vs public article listing
`GET /api/articles` filters to `isPublished = true` for public readers. The admin list must NOT use this endpoint — use a separate auth-gated admin endpoint (e.g. `/api/admin/articles`) that returns all articles regardless of publish status.

### JWT_SECRET
Must be set as an environment variable. The server should throw at startup if it is missing — never use a hardcoded fallback in production code.
