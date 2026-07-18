# BerugakNews - Struktur Website Lengkap

## 1. Arsitektur Keseluruhan

```
Monorepo (pnpm workspace)
├── artifacts/api-server/          # Backend API (Node.js + Express)
├── artifacts/balebeleq-web/       # Frontend (React + Vite)
├── packages/
│   ├── db/                        # Shared database schema (Drizzle ORM)
│   ├── api-zod/                   # Shared Zod schemas
│   └── api-client-react/          # Auto-generated React Query hooks (Orval)
└── attached_assets/               # Uploaded images/files
```

**Pattern:** Frontend (React SPA) ←→ REST API (Express) ←→ PostgreSQL Database

---

## 2. Tech Stack

### Backend (API Server)
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ (ESM) |
| Framework | Express 5 |
| Database ORM | Drizzle ORM |
| Database | PostgreSQL 15+ |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod (shared package) |
| File Storage | Google Cloud Storage (via Replit Object Storage) |
| Logging | Pino + pino-http |
| Build Tool | esbuild |

### Frontend (Web)
| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui (Radix-based) |
| Routing | wouter |
| State Management | TanStack Query (React Query) |
| HTTP Client | Auto-generated via Orval |
| Rich Text Editor | TipTap |
| Icons | Lucide React |
| SEO | react-helmet-async |
| Fonts | Fraunces (headings) + Outfit (body) |

### Monorepo Tooling
| Tool | Purpose |
|------|---------|
| pnpm | Package manager + workspace |
| TypeScript | Type checking |
| Orval | OpenAPI → React Query hooks generator |
| Zod | Runtime validation + TypeScript inference |

---

## 3. Struktur Folder Detail

### Backend: `artifacts/api-server/`
```
src/
├── index.ts              # Entry point (starts HTTP server)
├── app.ts                # Express app setup (middleware, routes)
├── routes/
│   ├── index.ts          # Route aggregator
│   ├── health.ts         # Health check endpoint
│   ├── auth.ts           # Login / me (JWT)
│   ├── articles.ts       # CRUD articles (public + admin)
│   ├── categories.ts     # CRUD categories
│   ├── storage.ts        # File upload (presigned URLs)
│   ├── users.ts          # Admin user management
│   └── profile.ts        # Admin profile
├── middlewares/
│   └── auth.ts           # JWT verification middleware
├── lib/
│   ├── logger.ts         # Pino logger config
│   ├── objectStorage.ts  # Google Cloud Storage wrapper
│   └── objectAcl.ts      # Object storage ACL/permissions
└── seed.ts               # Database seed script (admin + categories)
```

### Frontend: `artifacts/balebeleq-web/`
```
src/
├── main.tsx              # Entry point (React root + HelmetProvider)
├── App.tsx               # Router setup (wouter)
├── index.css             # Tailwind + custom styles
├── pages/
│   ├── home.tsx          # Homepage (articles list, featured)
│   ├── article-detail.tsx # Article view with SEO
│   ├── category-page.tsx # Articles by category
│   ├── search.tsx        # Search results
│   └── not-found.tsx     # 404 page
├── pages/admin/
│   ├── login.tsx         # Admin login
│   ├── dashboard.tsx     # Dashboard with stats
│   ├── article-list.tsx  # Manage articles
│   ├── article-form.tsx  # Create/edit article (TipTap editor)
│   ├── category-list.tsx # Manage categories
│   ├── user-management.tsx # Manage admins
│   ├── profile.tsx       # Admin profile
│   └── site-pages.tsx    # Static pages editor
├── components/
│   ├── seo.tsx           # SEO/OG meta tag component
│   ├── article-card.tsx  # Article preview card
│   ├── layout/
│   │   ├── public-layout.tsx  # Public site layout (header/footer)
│   │   └── admin-layout.tsx  # Admin dashboard layout
│   └── ui/               # shadcn/ui components (30+ components)
├── hooks/
│   └── use-auth.ts       # Auth state + login/logout
└── lib/
    └── utils.ts          # cn() helper (clsx + tailwind-merge)
```

---

## 4. Database Schema (PostgreSQL)

```sql
-- Admins (login users)
admins
  id SERIAL PRIMARY KEY
  username VARCHAR(255) UNIQUE NOT NULL
  password VARCHAR(255) NOT NULL        -- bcrypt hash
  email VARCHAR(255)
  role VARCHAR(50) DEFAULT 'owner'
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()

-- Categories (article categories)
categories
  id SERIAL PRIMARY KEY
  name VARCHAR(255) NOT NULL
  slug VARCHAR(255) UNIQUE NOT NULL
  color VARCHAR(7) NOT NULL             -- hex color
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()

-- Articles
articles
  id SERIAL PRIMARY KEY
  title VARCHAR(500) NOT NULL
  slug VARCHAR(500) UNIQUE NOT NULL
  excerpt TEXT NOT NULL
  content TEXT NOT NULL                -- HTML from TipTap
  image_url VARCHAR(1000)
  image_caption VARCHAR(500)
  category_id INTEGER → categories.id
  is_published BOOLEAN DEFAULT false
  is_featured BOOLEAN DEFAULT false
  view_count INTEGER DEFAULT 0
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()

-- Activity Log
activity_log
  id SERIAL PRIMARY KEY
  admin_id INTEGER → admins.id
  admin_username VARCHAR(255)
  action VARCHAR(255)                  -- e.g. "Buat artikel", "Hapus artikel"
  article_id INTEGER → articles.id
  article_title VARCHAR(500)
  details TEXT
  created_at TIMESTAMP DEFAULT NOW()
```

---

## 5. API Endpoints (REST)

### Public Endpoints (no auth)
```
GET    /api/articles              # List articles (paginated, filter by category/search)
GET    /api/articles/featured     # Featured articles (limit 5)
GET    /api/articles/:id          # Get article by ID
GET    /api/articles/:slug/slug   # Get article by slug
POST   /api/articles/:id/views    # Increment view count
GET    /api/categories            # List all categories
GET    /api/storage/public-objects/*  # Serve uploaded files
```

### Admin Endpoints (require JWT Bearer token)
```
POST   /api/auth/login            # Login → returns JWT token
GET    /api/auth/me               # Get current admin info

GET    /api/admin/articles        # List ALL articles (including drafts)
GET    /api/admin/articles/:id    # Get any article (including drafts)
GET    /api/admin/articles/stats  # Dashboard stats
POST   /api/articles              # Create article
PUT    /api/articles/:id          # Update article
DELETE /api/articles/:id          # Delete article

POST   /api/categories            # Create category
PUT    /api/categories/:id        # Update category
DELETE /api/categories/:id        # Delete category

GET    /api/users                 # List admins
POST   /api/users                 # Create admin
DELETE /api/users/:id             # Delete admin

POST   /api/storage/uploads/request-url  # Request presigned upload URL
GET    /api/profile               # Get admin profile
PUT    /api/profile               # Update profile
```

---

## 6. Autentikasi (JWT)

### Flow:
1. Admin login dengan `username` + `password`
2. Server verify dengan bcrypt → generate JWT token
3. Token disimpan di `localStorage` (key: `admin_token`)
4. Setiap request admin kirim header: `Authorization: Bearer <token>`
5. Server verify JWT dengan `JWT_SECRET`

### Environment Variables:
```
JWT_SECRET=<random-secret-string>     # Required untuk sign/verify JWT
```

---

## 7. File Storage (Upload Gambar)

### Mekanisme:
1. Client (admin) request presigned URL ke backend
2. Backend generate presigned URL dari Google Cloud Storage
3. Client upload file langsung ke GCS via presigned URL (bypass server)
4. File disimpan di bucket GCS dengan path: `<bucket>/uploads/<uuid>.ext`
5. Public URL: `https://bbnews--hpejanggik.replit.app/api/storage/public-objects/<path>`

### Environment Variables:
```
DEFAULT_OBJECT_STORAGE_BUCKET_ID=<bucket-id>
PUBLIC_OBJECT_SEARCH_PATHS=<bucket-path>
PRIVATE_OBJECT_DIR=<private-path>
```

---

## 8. Environment Variables (Production)

### API Server (.env)
```
PORT=8080                             # HTTP server port
DATABASE_URL=postgresql://...         # PostgreSQL connection
JWT_SECRET=your-secret-key            # JWT signing secret
NODE_ENV=production

# Object Storage (optional - for file uploads)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=...
PUBLIC_OBJECT_SEARCH_PATHS=...
PRIVATE_OBJECT_DIR=...
```

### Frontend (.env)
```
VITE_API_URL=https://your-domain.com  # Backend URL
```

---

## 9. Build Process

### Development:
```bash
# Backend
pnpm --filter @workspace/api-server run dev    # Build + start with hot reload

# Frontend
pnpm --filter @workspace/balebeleq-web run dev   # Vite dev server
```

### Production Build:
```bash
# Backend
pnpm --filter @workspace/api-server run build    # esbuild → dist/index.mjs
pnpm --filter @workspace/api-server run start    # node dist/index.mjs

# Frontend
pnpm --filter @workspace/balebeleq-web run build   # Vite → dist/public/
# Output: static files in dist/public/
```

---

## 10. Deploy ke Hostinger (VPS) - Panduan

### A. Setup Server (VPS Hostinger)
```bash
# 1. Install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm postgresql nginx

# 2. Install PM2 (process manager)
sudo npm install -g pm2

# 3. Setup PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE berugaknews;"
sudo -u postgres psql -c "CREATE USER berugak WITH PASSWORD 'your-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE berugaknews TO berugak;"
```

### B. Upload Project
```bash
# Upload via Git atau SCP
git clone <your-repo> /var/www/berugaknews
cd /var/www/berugaknews

# Install dependencies
pnpm install

# Build
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/balebeleq-web run build
```

### C. Setup Environment
```bash
# Create .env file for API server
cat > artifacts/api-server/.env << EOF
PORT=8080
DATABASE_URL=postgresql://berugak:your-password@localhost:5432/berugaknews
JWT_SECRET=your-random-secret-min-32-chars
NODE_ENV=production
EOF
```

### D. Jalankan dengan PM2
```bash
# Backend
pm2 start artifacts/api-server/dist/index.mjs --name "berugak-api"

# Save PM2 config
pm2 save
pm2 startup systemd
```

### E. Setup Nginx (Reverse Proxy)
```nginx
# /etc/nginx/sites-available/berugaknews
server {
    listen 80;
    server_name berugaknews.com www.berugaknews.com;
    
    # Frontend (static files)
    location / {
        root /var/www/berugaknews/artifacts/balebeleq-web/dist/public;
        try_files $uri $uri/ /index.html;
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # File uploads (serve public objects)
    location /api/storage/public-objects/ {
        proxy_pass http://localhost:8080/api/storage/public-objects/;
    }
}
```

### F. SSL dengan Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d berugaknews.com -d www.berugaknews.com
```

### G. Run Database Migration
```bash
# Apply schema (Drizzle migration)
cd /var/www/berugaknews/packages/db
npx drizzle-kit push:pg

# Seed default data
cd /var/www/berugaknews/artifacts/api-server
node dist/seed.mjs   # atau jalankan seed script
```

---

## 11. SEO / Open Graph (Facebook Sharing)

### Problem:
Facebook crawler tidak menjalankan JavaScript, jadi `react-helmet-async` tidak berfungsi untuk OG meta tags.

### Solusi (Server-Side Rendering untuk Article Routes):
Tambahkan route di Express API server untuk serve HTML dengan meta tag yang sudah di-inject:

```typescript
// Di api-server/src/app.ts atau route baru
// Route: GET /berita/:slug
// 1. Query article dari database
// 2. Generate HTML dengan meta tags (og:title, og:description, og:image)
// 3. Serve HTML ini untuk Facebook crawler
// 4. Browser normal tetap load React SPA
```

### Meta Tags yang Harus Ada:
```html
<meta property="og:title" content="Judul Artikel">
<meta property="og:description" content="Excerpt artikel">
<meta property="og:image" content="https://domain.com/gambar.jpg">
<meta property="og:url" content="https://domain.com/berita/slug">
<meta property="og:type" content="article">
<meta property="article:published_time" content="2025-01-01T00:00:00Z">
<meta name="twitter:card" content="summary_large_image">
```

---

## 12. Catatan Penting untuk Migrasi

### Yang Harus Diubah saat Pindah dari Replit:
1. **Database URL** → PostgreSQL di VPS Hostinger
2. **File Storage** → Replit Object Storage tidak bisa dipakai di luar Replit
   - Opsi A: Upload ke Cloudflare R2 / AWS S3 (dengan presigned URL)
   - Opsi B: Simpan file di server VPS langsung (nginx serve static)
   - Opsi C: Firebase Storage (free tier)
3. **API URL** → ganti dari `*.replit.app` ke domain sendiri
4. **JWT_SECRET** → generate baru yang beda
5. **SEO/OG** → perlu implementasi SSR untuk Facebook crawler

### File Storage Alternatif (Kalau Tidak Pakai Replit Object Storage):
```typescript
// Simpan file di server langsung
// Upload: POST /api/upload (multipart/form-data)
// Serve: GET /uploads/:filename
// Path: /var/www/berugaknews/uploads/
```

---

## 13. Fitur Website

### Public Site:
- Homepage dengan featured articles + latest articles
- Article detail page dengan rich text (HTML dari TipTap)
- Category filtering
- Search articles
- News ticker (running text)
- SEO meta tags (title, description, OG, Twitter Card)
- Responsive design (mobile-friendly)

### Admin Dashboard:
- Login dengan JWT
- Dashboard statistik (total artikel, draft, views)
- CRUD Artikel (TipTap rich text editor)
- CRUD Kategori
- Manage Admin Users
- Activity Log
- Profile Settings
- File Upload (gambar artikel)

---

## 14. Dependencies Utama (package.json)

### Backend:
```json
{
  "express": "^5.2.1",
  "drizzle-orm": "catalog",
  "pg": "^8.x",
  "jsonwebtoken": "^9.0.3",
  "bcryptjs": "^3.0.3",
  "cors": "^2.8.6",
  "pino": "^9.14.0",
  "pino-http": "^10.5.0",
  "slugify": "^1.6.9",
  "zod": "^3.x"
}
```

### Frontend:
```json
{
  "react": "^19",
  "react-dom": "^19",
  "vite": "^7.3.3",
  "tailwindcss": "^4",
  "wouter": "^3.x",
  "@tanstack/react-query": "^5.x",
  "react-helmet-async": "^2.x",
  "@tiptap/react": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "lucide-react": "^0.x",
  "zod": "^3.x"
}
```

---

## 15. Contoh Data Flow (Buat Artikel Baru)

1. **Admin login** → POST /api/auth/login → dapat JWT token
2. **Open article form** → Admin dashboard → /admin/articles/new
3. **Write content** → TipTap editor → generate HTML
4. **Upload image** → Request presigned URL → Upload ke GCS → dapat imageUrl
5. **Submit article** → POST /api/articles (dengan JWT header)
   ```json
   {
     "title": "Judul Berita",
     "excerpt": "Ringkasan singkat...",
     "content": "<p>Isi berita HTML...</p>",
     "imageUrl": "https://.../uploads/gambar.jpg",
     "categoryId": 1,
     "isPublished": true,
     "isFeatured": false
   }
   ```
6. **Server process** → Generate slug → Insert ke database → Log activity
7. **Article live** → Bisa diakses di /berita/judul-berita-123456789

---

## 16. Commands Cheat Sheet

```bash
# Install semua dependencies
pnpm install

# Dev mode
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/balebeleq-web run dev

# Build production
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/balebeleq-web run build

# Seed database (admin + categories)
cd artifacts/api-server && npx tsx src/seed.ts

# Database migration (Drizzle)
cd packages/db && npx drizzle-kit push:pg
```
