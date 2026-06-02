# 📰 BaleBeleqNews — Dokumentasi Teknis Lengkap
> Untuk kebutuhan debugging, recode, atau meminta bantuan AI lain

---

## 1. GAMBARAN BESAR SISTEM

BaleBeleqNews adalah aplikasi berita lokal berbasis web yang terdiri dari **3 bagian utama**:

```
Browser Pengguna
     │
     ▼
[Frontend React]  ←→  [API Server Express]  ←→  [Database PostgreSQL]
port 23187              port 8080                  (Neon / Replit DB)
```

| Bagian | Teknologi | Lokasi File |
|--------|-----------|-------------|
| Frontend (UI web) | React + Vite + TypeScript + Tailwind | `artifacts/balebeleq-web/` |
| Backend (API) | Node.js + Express + TypeScript | `artifacts/api-server/` |
| Database | PostgreSQL + Drizzle ORM | `lib/db/` |
| Spesifikasi API | OpenAPI 3.0 YAML | `lib/api-spec/openapi.yaml` |
| Client API (auto) | React Query hooks (orval codegen) | `lib/api-client-react/` + `lib/api-zod/` |

---

## 2. STRUKTUR FOLDER LENGKAP

```
workspace/
├── artifacts/
│   ├── api-server/              # Backend Express
│   │   └── src/
│   │       ├── index.ts         # Entry point, listen port 8080
│   │       ├── routes/
│   │       │   ├── index.ts     # Mount semua router
│   │       │   ├── articles.ts  # CRUD artikel
│   │       │   ├── categories.ts# CRUD kategori
│   │       │   └── auth.ts      # Login admin
│   │       ├── middlewares/
│   │       │   └── auth.ts      # JWT verifier middleware
│   │       └── seed.ts          # Script isi data awal
│   │
│   └── balebeleq-web/           # Frontend React
│       ├── public/
│       │   └── logo.png         # Logo BaleBeleq
│       └── src/
│           ├── App.tsx          # Router utama, setup auth token
│           ├── index.css        # CSS global (Tailwind + Google Fonts)
│           ├── components/
│           │   ├── layout/
│           │   │   ├── public-layout.tsx   # Header + Footer publik
│           │   │   └── admin-layout.tsx    # Sidebar admin
│           │   ├── article-card.tsx        # Komponen kartu artikel
│           │   └── ui/                     # Komponen shadcn/ui
│           ├── pages/
│           │   ├── home.tsx               # Homepage
│           │   ├── article-detail.tsx     # Detail artikel
│           │   ├── category-page.tsx      # Artikel per kategori
│           │   ├── not-found.tsx          # Halaman 404
│           │   └── admin/
│           │       ├── login.tsx          # Form login admin
│           │       ├── dashboard.tsx      # Statistik
│           │       ├── article-list.tsx   # Daftar artikel
│           │       ├── article-form.tsx   # Buat/edit artikel
│           │       └── category-list.tsx  # Kelola kategori
│           └── hooks/
│               └── use-auth.ts            # Hook cek status login admin
│
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml         # SUMBER KEBENARAN semua endpoint API
│   ├── api-client-react/        # AUTO-GENERATED dari openapi.yaml
│   │   └── src/generated/       # Jangan edit manual!
│   ├── api-zod/                 # AUTO-GENERATED validasi schema zod
│   │   └── src/generated/
│   └── db/
│       ├── src/
│       │   ├── schema/index.ts  # Definisi tabel database
│       │   └── index.ts         # Export koneksi db
│       └── drizzle/             # File migrasi SQL
│
├── api/
│   └── index.ts                 # Wrapper untuk Vercel Serverless
├── vercel.json                  # Konfigurasi deploy Vercel
├── package.json                 # Root monorepo (pnpm workspace)
└── pnpm-workspace.yaml          # Daftar workspace packages
```

---

## 3. DATABASE (PostgreSQL)

### Tabel yang ada:

#### `articles` — Artikel berita
```sql
id          SERIAL PRIMARY KEY
title       TEXT NOT NULL            -- Judul artikel
slug        TEXT UNIQUE NOT NULL     -- URL-friendly, auto dari title
content     TEXT NOT NULL            -- Isi artikel (HTML/plain)
excerpt     TEXT                     -- Ringkasan singkat
image_url   TEXT                     -- URL gambar header
category_id INTEGER → categories.id -- Kategori artikel
is_published BOOLEAN DEFAULT false  -- true = tampil publik
is_featured  BOOLEAN DEFAULT false  -- true = tampil di sorotan utama
view_count   INTEGER DEFAULT 0      -- Jumlah kali dilihat
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

#### `categories` — Kategori artikel
```sql
id        SERIAL PRIMARY KEY
name      TEXT NOT NULL            -- Nama: "Berita Lokal", dll
slug      TEXT UNIQUE NOT NULL     -- URL: "berita-lokal", dll
created_at TIMESTAMP
```

#### `admins` — Akun admin
```sql
id              SERIAL PRIMARY KEY
username        TEXT UNIQUE NOT NULL
password_hash   TEXT NOT NULL        -- bcrypt hash, BUKAN plain text
created_at      TIMESTAMP
```

### Mengelola database:
```bash
# Setelah ubah schema, push ke database:
pnpm --filter @workspace/db run push

# Isi data awal (admin + kategori + artikel contoh):
pnpm --filter @workspace/api-server run seed

# Generate migrasi SQL:
pnpm --filter @workspace/db run generate
```

---

## 4. API ENDPOINTS (Backend)

Base URL di development: `http://localhost:8080/api`
Base URL di Vercel: `https://[your-domain].vercel.app/api`

### Publik (tidak butuh login):
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/articles` | Daftar artikel (query: limit, offset, categoryId) |
| GET | `/articles/featured` | Artikel featured |
| GET | `/articles/:slug` | Detail artikel (otomatis +1 view) |
| GET | `/categories` | Semua kategori |
| GET | `/categories/:slug` | Detail + artikel per kategori |

### Admin (butuh JWT Bearer token):
| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/auth/login` | Login, dapat token JWT |
| GET | `/auth/me` | Cek status login |
| POST | `/articles` | Buat artikel baru |
| PUT | `/articles/:id` | Edit artikel |
| DELETE | `/articles/:id` | Hapus artikel |
| POST | `/categories` | Buat kategori |
| PUT | `/categories/:id` | Edit kategori |
| DELETE | `/categories/:id` | Hapus kategori |

### Format request login:
```json
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

### Format response login (berhasil):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "username": "admin"
  }
}
```

---

## 5. SISTEM AUTENTIKASI ADMIN — DETAIL LENGKAP

### Alur Login (Step by Step):

```
1. User buka /admin
2. App cek localStorage → ada "admin_token"?
   ├── TIDAK ada → tampilkan form login
   └── ADA → kirim GET /api/auth/me dengan token
              ├── Token VALID   → redirect ke /admin/dashboard
              └── Token EXPIRED → hapus token, tampilkan form login

3. User isi username + password → klik Masuk
4. Frontend kirim POST /api/auth/login
5. Backend:
   a. Cari admin di DB dengan username tersebut
   b. Bandingkan password dengan bcrypt.compare(input, hash_di_db)
   c. Jika cocok → buat JWT token (expires 7 hari)
   d. Kirim token ke frontend

6. Frontend:
   a. Simpan token di localStorage["admin_token"]
   b. Redirect ke /admin/dashboard

7. Semua request admin selanjutnya:
   → Header: Authorization: Bearer [token]
   → Backend verifikasi token dengan JWT_SECRET
```

### Di mana token disimpan:
- **localStorage key**: `admin_token`
- **Otomatis dikirim**: Setup di `App.tsx` via `setAuthTokenGetter()`
- **Masa berlaku**: 7 hari (setelah itu harus login ulang)

### JWT Secret:
- Development: `"balebeleq-secret-change-in-prod"` (hardcoded default)
- Production: **WAJIB** set env var `JWT_SECRET` ke string random panjang

### Hook `use-auth.ts` — cara frontend cek login:
```typescript
// File: artifacts/balebeleq-web/src/hooks/use-auth.ts
// Melakukan:
// 1. Panggil GET /api/auth/me saat komponen mount
// 2. Simpan data user (atau null jika tidak login)
// 3. Jika tidak login di halaman /admin/* → redirect ke /admin
// 4. Expose: { user, isLoading, logout }
```

---

## 6. FRONTEND — CARA KERJA ROUTING

File utama: `artifacts/balebeleq-web/src/App.tsx`

```
URL /                   → Home (daftar berita)
URL /artikel/:slug      → Detail artikel
URL /kategori/:slug     → Artikel per kategori
URL /admin              → Form login admin (TERSEMBUNYI)
URL /admin/dashboard    → Dashboard (butuh login)
URL /admin/artikel      → Daftar artikel (butuh login)
URL /admin/artikel/baru → Buat artikel baru (butuh login)
URL /admin/artikel/:id/edit → Edit artikel (butuh login)
URL /admin/kategori     → Kelola kategori (butuh login)
URL [lainnya]           → Halaman 404
```

Routing menggunakan library **wouter** (ringan, mirip React Router).

---

## 7. API CLIENT — CARA KERJA CODEGEN

Ini bagian paling penting yang **sering membingungkan**:

```
lib/api-spec/openapi.yaml   ← Satu-satunya file yang diedit manual
        │
        ▼ (pnpm codegen)
lib/api-client-react/src/generated/   ← AUTO-GENERATED (jangan edit!)
lib/api-zod/src/generated/            ← AUTO-GENERATED (jangan edit!)
```

**Tool yang digunakan**: `orval` — membaca OpenAPI spec, generate React Query hooks

**Cara regenerate** (jika ada perubahan API):
```bash
pnpm --filter @workspace/api-spec run codegen
```

**Cara pakai di komponen React:**
```typescript
import { useListArticles, useGetFeaturedArticles } from "@workspace/api-client-react";

// Dalam komponen:
const { data: articles, isLoading } = useListArticles({ limit: 10 });
const { data: featured } = useGetFeaturedArticles();
```

---

## 8. CARA DEPLOY KE VERCEL

### Persiapan:
1. **Buat database Neon** di https://neon.tech (gratis)
   - Sign up → Create Project → Copy connection string
   - Format: `postgresql://user:password@host/dbname?sslmode=require`

2. **Push ke GitHub** (repo sudah ada: ozysparda/BaleBeleqNews)

### Di Vercel:
1. Import repo dari GitHub
2. **Framework Preset**: Vite (atau Other)
3. **Build Command**: `pnpm run build:vercel`
4. **Output Directory**: `artifacts/balebeleq-web/dist`
5. **Install Command**: `pnpm install`
6. **Environment Variables** (WAJIB diisi):
   ```
   DATABASE_URL = postgresql://...  (dari Neon)
   JWT_SECRET   = [random string panjang, misal 64 karakter]
   NODE_ENV     = production
   ```

7. Deploy → setelah selesai, jalankan seed sekali:
   ```bash
   # Dari terminal lokal (atau Replit shell):
   DATABASE_URL=... pnpm --filter @workspace/api-server run seed
   ```

### File konfigurasi Vercel:
```json
// vercel.json (di root project)
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" }
  ],
  "outputDirectory": "artifacts/balebeleq-web/dist"
}
```

```typescript
// api/index.ts — Wrapper serverless
// Mengekspor Express app untuk Vercel Functions
// Semua request ke /api/* diteruskan ke sini
```

---

## 9. CARA MEMINTA BANTUAN AI (Claude/GPT/dll)

Ketika kamu butuh bantuan AI lain untuk debug atau recode, berikan konteks ini:

### Prompt template untuk AI:
```
Aku punya project portal berita bernama BaleBeleqNews.
Tech stack:
- Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui + wouter (routing) + React Query
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Drizzle ORM
- Monorepo dengan pnpm workspace

Struktur folder penting:
- Frontend: artifacts/balebeleq-web/src/
- Backend routes: artifacts/api-server/src/routes/
- DB schema: lib/db/src/schema/index.ts
- API spec (OpenAPI): lib/api-spec/openapi.yaml
- Auto-generated hooks: lib/api-client-react/src/generated/ (JANGAN DIEDIT)

Authentication: JWT disimpan di localStorage["admin_token"],
dikirim via Bearer token header.
Admin route tersembunyi di /admin.

[Jelaskan masalahmu di sini]
```

---

## 10. TROUBLESHOOTING UMUM

| Masalah | Solusi |
|---------|--------|
| Login gagal terus | Cek password di DB: `SELECT username, password_hash FROM admins;` |
| API tidak respons | Pastikan workflow API Server running di Replit |
| Artikel tidak muncul | Cek `is_published = true` di database |
| Error setelah ubah schema DB | Jalankan `pnpm --filter @workspace/db run push` |
| JWT expired | Logout → login ulang, atau clear localStorage |
| Build error TypeScript | Jangan edit file di `*/generated/` — regenerate saja |
| Gambar tidak muncul | Pastikan image_url adalah URL yang valid dan bisa diakses publik |

---

## 11. PERINTAH-PERINTAH PENTING

```bash
# Jalankan development (semua sekaligus):
pnpm run dev

# Jalankan backend saja:
pnpm --filter @workspace/api-server run dev

# Jalankan frontend saja:
pnpm --filter @workspace/balebeleq-web run dev

# Build frontend untuk production:
pnpm --filter @workspace/balebeleq-web run build

# Regenerate API client dari openapi.yaml:
pnpm --filter @workspace/api-spec run codegen

# Push schema database:
pnpm --filter @workspace/db run push

# Seed database (data awal):
pnpm --filter @workspace/api-server run seed

# Install semua dependency:
pnpm install
```

---

## 12. KREDENSIAL DEFAULT

| Item | Nilai |
|------|-------|
| Admin username | `admin` |
| Admin password | `admin123` |
| JWT Secret (dev) | `balebeleq-secret-change-in-prod` |
| Admin URL | `/admin` |
| API Base URL | `/api` |

> ⚠️ **GANTI SEMUA INI di production!** Terutama JWT_SECRET dan password admin.

---

*Dokumentasi dibuat: 3 Juni 2026*
