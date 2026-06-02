import { Link, useLocation } from "wouter";
import { useListCategories } from "@workspace/api-client-react";
import { Search, X, Menu } from "lucide-react";
import { useState, useRef, useEffect } from "react";
const logoImg = `${import.meta.env.BASE_URL}logo.png`;

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
            className="h-9 pl-9 pr-4 rounded-full border border-border bg-muted/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-52 md:w-72"
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

export function PublicHeader() {
  const { data: categories } = useListCategories();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src={logoImg} alt="BaleBeleqNews Logo" className="h-10 w-10 object-contain" />
          <span className="font-serif text-xl font-black tracking-tight">
            <span className="text-primary">BaleBeleq</span><span className="text-foreground">News</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <nav className="flex items-center gap-1 text-sm font-medium mr-2">
            <Link href="/" className="px-3 py-1.5 rounded-md text-foreground hover:text-primary hover:bg-muted transition-colors">
              Terbaru
            </Link>
            {categories?.slice(0, 5).map(category => (
              <Link
                key={category.id}
                href={`/kategori/${category.slug}`}
                className="px-3 py-1.5 rounded-md text-foreground hover:text-primary hover:bg-muted transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </nav>
          <SearchBar />
        </div>

        <div className="flex md:hidden items-center gap-2">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-secondary text-secondary-foreground mt-20 py-12">
      <div className="container mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src={logoImg} alt="BaleBeleqNews Logo" className="h-12 w-12 object-contain" />
          <h2 className="font-serif text-2xl font-bold">BaleBeleqNews</h2>
        </div>
        <p className="text-sm text-secondary-foreground/60 italic mb-1">Informasi · Budaya · Aspirasi</p>
        <p className="text-secondary-foreground/70 mb-8 max-w-md mx-auto">
          Dari Bale Beleq, Untuk Publik. Menyajikan informasi terkini dan akurat untuk masyarakat.
        </p>
        <p className="text-xs text-secondary-foreground/40 uppercase tracking-widest mb-2">
          Cepat · Akurat · Berimbang · Terpercaya
        </p>
        <div className="text-sm text-secondary-foreground/50 mt-4">
          &copy; {new Date().getFullYear()} BaleBeleqNews. Hak cipta dilindungi.
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
