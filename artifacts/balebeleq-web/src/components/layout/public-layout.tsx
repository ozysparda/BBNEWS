import { Link } from "wouter";
import { useListCategories } from "@workspace/api-client-react";
import logoImg from "/logo.png";

export function PublicHeader() {
  const { data: categories } = useListCategories();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src={logoImg} alt="BaleBeleqNews Logo" className="h-10 w-10 object-contain" />
          <span className="font-serif text-xl font-black tracking-tight">
            <span className="text-primary">BaleBeleq</span><span className="text-foreground">News</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-foreground hover:text-primary transition-colors">
              Terbaru
            </Link>
            {categories?.slice(0, 5).map(category => (
              <Link key={category.id} href={`/kategori/${category.slug}`} className="text-foreground hover:text-primary transition-colors">
                {category.name}
              </Link>
            ))}
          </nav>
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
