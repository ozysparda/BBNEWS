# BaleBeleqNews

Portal berita lokal terpercaya — backend Express + frontend React, siap deploy ke Vercel dengan database Neon PostgreSQL.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — jalankan API server (port 8080)
- `pnpm --filter @workspace/balebeleq-web run dev` — jalankan frontend (port dari env PORT)
- `pnpm run typecheck` — full typecheck semua packages
- `pnpm run build` — typecheck + build semua packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks dan Zod schemas dari OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — seed database dengan data awal
- Required env: `DATABASE_URL` — Postgres connection string (Neon untuk produksi)
- Optional env: `JWT_SECRET` — secret untuk JWT token admin (wajib diganti di produksi!)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + bcryptjs + jsonwebtoken
- DB: PostgreSQL + Drizzle ORM
- Frontend: React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (dari OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — sumber kebenaran untuk semua kontrak API
- `lib/db/src/schema/` — DB schema (articles, categories, admins)
- `artifacts/api-server/src/routes/` — route handlers (articles, categories, auth)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware
- `artifacts/api-server/src/seed.ts` — seed script
- `artifacts/balebeleq-web/src/` — frontend React

## Pages / Routes

### Public
- `/` — Homepage dengan berita featured dan terbaru
- `/berita/:slug` — Halaman detail artikel
- `/kategori/:slug` — Artikel berdasarkan kategori

### Admin (tersembunyi — tidak ada link di navigasi publik)
- `/admin` — **Form login admin** (masuk di sini!)
- `/admin/dashboard` — Dashboard stats
- `/admin/artikel` — Daftar semua artikel (termasuk draft)
- `/admin/artikel/baru` — Tulis artikel baru
- `/admin/artikel/:id/edit` — Edit artikel
- `/admin/kategori` — Kelola kategori

## Admin Default Credentials

- **Username**: `admin`
- **Password**: `admin123`
- **PENTING**: Ganti password ini setelah login pertama!

## Deploy ke Vercel

1. Push repo ke GitHub
2. Buat akun [Neon](https://neon.tech) (gratis), buat project baru, copy connection string
3. Di Vercel: import repo GitHub, tambahkan environment variables:
   - `DATABASE_URL` = connection string dari Neon
   - `JWT_SECRET` = random string panjang (gunakan password generator)
4. Vercel akan otomatis build & deploy
5. Setelah deploy pertama, jalankan `pnpm --filter @workspace/api-server run seed` sekali untuk isi data awal

## Architecture decisions

- JWT disimpan di localStorage frontend, dikirim via Bearer token header
- `setAuthTokenGetter` dari custom-fetch otomatis inject token ke setiap request API
- Route `/admin` tidak dilink dari navigasi publik (hidden route)
- Artikel bisa berisi HTML mentah di field `content`
- Slug artikel auto-generated dari judul saat create

## Gotchas

- Setelah ubah `openapi.yaml`, selalu jalankan `pnpm --filter @workspace/api-spec run codegen`
- `JWT_SECRET` harus diset di produksi, default value tidak aman
- Google Fonts `@import` harus di baris PERTAMA `index.css` (sebelum `@import "tailwindcss"`)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
