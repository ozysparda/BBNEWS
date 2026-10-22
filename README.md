# BerugakNews

Portal berita online untuk Lombok.

## Deploy ke Vercel

Project ini sudah dikonfigurasi untuk deploy ke Vercel dari GitHub.

### Langkah-langkah

1. **Push ke GitHub**

   ```bash
   git init
   git add .
   git commit -m "Siap deploy ke Vercel"
   git branch -M main
   git remote add origin https://github.com/username/berugaknews.git
   git push -u origin main
   ```

2. **Import ke Vercel**
   - Buka [vercel.com](https://vercel.com) → Add New Project.
   - Pilih repository BerugakNews.
   - Pastikan build command: `pnpm run vercel-build`
   - Output directory: `artifacts/balebeleq-web/dist/public`

3. **Environment Variables** (Vercel → Project Settings → Environment Variables)
   - `POSTGRES_URL` — Vercel Postgres connection string
   - `BLOB_READ_WRITE_TOKEN` — Vercel Blob read/write token
   - `JWT_SECRET` — secret untuk sign JWT (min. 32 karakter)
   - `SESSION_SECRET` — secret untuk session

4. **Setup Database**
   - Provision Vercel Postgres di dashboard Vercel.
   - Jalankan Drizzle push untuk membuat tabel:
     ```bash
     POSTGRES_URL="..." pnpm --filter @workspace/db run push
     ```
   - Seed data awal (admin default `admin` / `admin123`):
     ```bash
     pnpm --filter @workspace/api-server run seed:vercel
     ```

5. **Deploy**
   - Klik **Deploy** di Vercel.
   - Setelah selesai, website live siap digunakan.

## Struktur Teknologi

- **Frontend**: React 19 + Vite 7 + Tailwind CSS 4 + wouter + TanStack Query
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL (Vercel Postgres)
- **Upload**: Vercel Blob
- **Auth**: JWT (token disimpan di `localStorage`)

## Perintah Berguna

```bash
pnpm --filter @workspace/balebeleq-web run dev      # dev frontend
pnpm --filter @workspace/api-server run dev           # dev backend
pnpm run typecheck                                    # typecheck semua
pnpm run vercel-build                                 # build untuk Vercel
```
