# BerugakNews

Portal berita online untuk Lombok. Dibangun dengan React + Vite di frontend, Express + Drizzle ORM di backend, dan PostgreSQL sebagai database.

## Run & Operate (Replit)

- `pnpm --filter @workspace/balebeleq-web run dev` — jalankan frontend
- `pnpm --filter @workspace/api-server run dev` — jalankan API server
- `pnpm run typecheck` — typecheck seluruh workspace
- `pnpm --filter @workspace/db run push` — push schema DB ke PostgreSQL (dev)
- `pnpm --filter @workspace/api-server run seed:vercel` — seed data awal (admin + kategori)

## Stack

- pnpm workspaces, TypeScript 5.9
- Frontend: React 19, Vite 7, Tailwind 4, wouter, TanStack Query
- Backend: Express 5, Drizzle ORM, PostgreSQL (Vercel Postgres)
- Upload: Vercel Blob
- Auth: JWT di `localStorage`

## Deploy ke Vercel + GitHub

1. **Push project ini ke GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Siap deploy ke Vercel"
   git branch -M main
   git remote add origin https://github.com/username/berugaknews.git
   git push -u origin main
   ```

2. **Buat project di Vercel**:
   - Buka [vercel.com](https://vercel.com) → Add New Project → Import dari GitHub.
   - Pilih repository BerugakNews.
   - Framework Preset: **Other** (karena project ini monorepo custom).
   - Build Command: `pnpm run vercel-build`
   - Output Directory: `artifacts/balebeleq-web/dist/public`
   - Klik **Deploy**.

3. **Tambahkan Environment Variables di Vercel** (Settings → Environment Variables):
   - `POSTGRES_URL` — connection string Vercel Postgres
   - `BLOB_READ_WRITE_TOKEN` — token dari Vercel Blob
   - `JWT_SECRET` — string acak untuk sign JWT (min. 32 karakter)
   - `SESSION_SECRET` — string acak untuk session (jika diperlukan)

4. **Setup database**:
   - Provision **Vercel Postgres** dari dashboard Vercel.
   - Setelah `POSTGRES_URL` tersedia, jalankan **Drizzle push** untuk membuat tabel:
     ```bash
     vercel --prod env pull .env.production.local
     POSTGRES_URL="..." pnpm --filter @workspace/db run push
     ```
   - Seed data awal (admin default `admin` / `admin123` + 6 kategori):
     ```bash
     vercel --prod env pull .env.production.local
     pnpm --filter @workspace/api-server run seed:vercel
     ```

5. **Redeploy**: Setelah env variables lengkap dan database siap, klik **Redeploy** di Vercel.

## Catatan Penting

- Semua file hasil build (`dist/`, `api/index.mjs`) tidak perlu di-push ke GitHub — sudah ada di `.gitignore`.
- Untuk development lokal, tetap gunakan `DATABASE_URL`. Untuk Vercel, gunakan `POSTGRES_URL`.
- Gambar/gambar artikel diunggah langsung ke **Vercel Blob**, bukan ke disk server.
