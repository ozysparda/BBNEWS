import { AdminLayout } from "@/components/layout/admin-layout";
import { ExternalLink, Home, FileText, Tag, Search, Lock, LayoutDashboard, Users, Globe, User } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const SITE_URL = window.location.origin + BASE_URL;

const publicPages = [
  { href: "/", label: "Beranda", icon: Home, desc: "Halaman utama dengan artikel sorotan & terbaru" },
  { href: "/berita/:slug", label: "Detail Artikel", icon: FileText, desc: "Halaman baca artikel (diakses dari link artikel)" },
  { href: "/kategori/:slug", label: "Halaman Kategori", icon: Tag, desc: "Daftar artikel berdasarkan kategori" },
  { href: "/cari", label: "Pencarian", icon: Search, desc: "Cari artikel berdasarkan kata kunci" },
];

const adminPages = [
  { href: "/admin", label: "Login Admin", icon: Lock, desc: "Halaman login panel administrasi" },
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Statistik & ringkasan konten" },
  { href: "/admin/artikel", label: "Kelola Artikel", icon: FileText, desc: "Daftar, tambah, edit, hapus artikel" },
  { href: "/admin/artikel/baru", label: "Tulis Artikel Baru", icon: FileText, desc: "Form penulisan artikel baru dengan editor lengkap" },
  { href: "/admin/kategori", label: "Kelola Kategori", icon: Tag, desc: "Atur kategori berita" },
  { href: "/admin/pengguna", label: "Kelola Pengguna", icon: Users, desc: "Manajemen akun admin (khusus owner)" },
  { href: "/admin/profil", label: "Profil Saya", icon: User, desc: "Ubah password, lihat statistik & log aktivitas" },
];

function PageCard({ href, label, icon: Icon, desc, isAdmin }: { href: string; label: string; icon: any; desc: string; isAdmin?: boolean }) {
  const fullUrl = `${SITE_URL}${href}`;
  const hasParam = href.includes(":");

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isAdmin ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{label}</span>
            {!hasParam && (
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
              </a>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          <code className="text-[11px] text-muted-foreground/70 mt-1 block font-mono">{href}</code>
        </div>
      </div>
    </div>
  );
}

export default function AdminSitePages() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Daftar Halaman</h1>
        <p className="text-muted-foreground mt-1">Semua halaman yang tersedia di website BaleBeleqNews</p>
      </div>

      {/* Site URL info */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-center gap-3">
        <Globe className="w-5 h-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">URL Website</p>
          <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
            {SITE_URL}
          </a>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Halaman Publik
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {publicPages.map((p) => <PageCard key={p.href} {...p} />)}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Halaman Admin
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {adminPages.map((p) => <PageCard key={p.href} {...p} isAdmin />)}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
