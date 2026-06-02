import { Link, useLocation } from "wouter";
import { useListCategories } from "@workspace/api-client-react";
import { Search, X, Menu } from "lucide-react";
import { useState, useRef, useEffect } from "react";
const logoImg = `${import.meta.env.BASE_URL}logo.png`;
const bannerImg = `${import.meta.env.BASE_URL}banner.png`;

function SearchBar() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/cari?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
    setQuery("");
  }

  if (open) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari artikel..."
            className="h-9 pl-9 pr-4 rounded-full border border-border bg-muted/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-44 sm:w-64"
          />
        </div>
        <button type="button" onClick={() => { setOpen(false); setQuery(""); }} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="p-2 rounded-full hover:bg-muted transition-colors text-foreground hover:text-primary"
      aria-label="Cari artikel"
    >
      <Search className="w-5 h-5" />
    </button>
  );
}

function MobileMenu({ categories }: { categories: { id: number; name: string; slug: string }[] }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => { setOpen(false); }, [location]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-muted transition-colors text-foreground"
        aria-label="Menu"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
          <div className="fixed top-0 right-0 bottom-0 w-72 bg-background z-50 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <Link href="/" className="flex items-center gap-2">
                <img src={logoImg} alt="BaleBeleqNews" className="h-8 w-8 object-contain" />
                <span className="font-serif font-black text-lg">
                  <span className="text-primary">BaleBeleq</span><span>News</span>
                </span>
              </Link>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-full hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-2">
              <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                Beranda
              </Link>
              <div className="px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2 mb-1">
                Kategori
              </div>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/kategori/${cat.slug}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
              <Link href="/cari" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                <Search className="w-4 h-4" />
                Cari Artikel
              </Link>
            </nav>
          </div>
        </>
      )}
    </>
  );
}

export function PublicHeader() {
  const { data: categories } = useListCategories();
  const cats = categories ?? [];

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50 shadow-sm">
      {/* Top bar */}
      <div className="bg-primary text-primary-foreground text-xs py-1 px-4 text-center hidden sm:block">
        <span className="opacity-80">Cepat · Akurat · Berimbang · Terpercaya</span>
      </div>

      <div className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src={logoImg} alt="BaleBeleqNews Logo" className="h-9 w-9 sm:h-11 sm:w-11 object-contain" />
          <span className="font-serif text-lg sm:text-xl font-black tracking-tight leading-none">
            <span className="text-primary">Bale</span><span className="text-green-700">Beleq</span>
            <span className="text-red-600 text-xs font-bold ml-1 bg-red-600 text-white px-1 rounded-sm">NEWS</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 text-sm font-medium flex-1 justify-center max-w-xl">
          <Link href="/" className="px-3 py-1.5 rounded-md text-foreground hover:text-primary hover:bg-muted transition-colors whitespace-nowrap">
            Terbaru
          </Link>
          {cats.slice(0, 5).map((category) => (
            <Link
              key={category.id}
              href={`/kategori/${category.slug}`}
              className="px-3 py-1.5 rounded-md text-foreground hover:text-primary hover:bg-muted transition-colors whitespace-nowrap"
            >
              {category.name}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1.5">
          <SearchBar />
          <div className="flex md:hidden">
            <MobileMenu categories={cats} />
          </div>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      {/* Banner strip */}
      <div className="w-full overflow-hidden max-h-36">
        <img src={bannerImg} alt="BaleBeleqNews Banner" className="w-full object-cover object-center opacity-70" />
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <img src={logoImg} alt="BaleBeleqNews Logo" className="h-12 w-12 object-contain" />
              <div>
                <h2 className="font-serif text-xl font-bold text-white">BaleBeleqNews</h2>
                <p className="text-xs text-gray-400 italic">Dari Bale Beleq, Untuk Publik</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Portal berita lokal yang menyajikan informasi terkini, budaya, dan aspirasi masyarakat Lombok secara cepat, akurat, berimbang, dan terpercaya.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-3">Informasi</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-white transition-colors">Beranda</Link></li>
              <li><Link href="/cari" className="hover:text-white transition-colors">Pencarian</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} BaleBeleqNews. Hak cipta dilindungi.
          </p>
          <p className="text-xs text-gray-600 uppercase tracking-widest">
            Informasi · Budaya · Aspirasi
          </p>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
