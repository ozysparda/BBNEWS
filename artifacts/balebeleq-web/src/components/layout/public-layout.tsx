import { Link } from "wouter";
import { useListCategories } from "@workspace/api-client-react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PublicHeader() {
  const { data: categories } = useListCategories();

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-serif text-2xl font-black text-primary tracking-tight">
          BaleBeleq<span className="text-foreground">News</span>
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
        <h2 className="font-serif text-2xl font-bold mb-4">BaleBeleqNews</h2>
        <p className="text-secondary-foreground/70 mb-8 max-w-md mx-auto">
          Portal berita lokal terpercaya. Menyajikan informasi terkini dan akurat untuk masyarakat.
        </p>
        <div className="text-sm text-secondary-foreground/50">
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
