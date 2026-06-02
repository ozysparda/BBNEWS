import { useSearch, useLocation } from "wouter";
import { useListArticles } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { ArticleCard } from "@/components/article-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchX, Search, ShieldCheck } from "lucide-react";
import { useState, useRef } from "react";

const SECRET_CODE = "adminbale";

export default function SearchPage() {
  const rawSearch = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(rawSearch);
  const q = params.get("q") ?? "";

  const [secretInput, setSecretInput] = useState("");
  const [showAdminLink, setShowAdminLink] = useState(false);
  const secretRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useListArticles(
    { search: q, limit: 20 },
    { query: { enabled: q.trim().length > 0, queryKey: undefined as any } }
  );

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;

  function handleSecretChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSecretInput(val);
    if (val === SECRET_CODE) {
      setShowAdminLink(true);
    }
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <Search className="w-6 h-6 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-serif font-bold">
              {q ? `Hasil pencarian: "${q}"` : "Cari Artikel"}
            </h1>
            {q && !isLoading && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {total > 0 ? `${total} artikel ditemukan` : "Tidak ada artikel yang cocok"}
              </p>
            )}
          </div>
        </div>

        {!q && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Search className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg">Ketik kata kunci di search bar untuk mulai mencari.</p>

            {/* Secret code field — hidden in plain sight */}
            <div className="mt-16 w-full max-w-xs">
              <input
                ref={secretRef}
                type="text"
                value={secretInput}
                onChange={handleSecretChange}
                placeholder="Kode akses khusus..."
                className="w-full text-center text-sm px-4 py-2 rounded-full border border-border bg-muted/40 text-muted-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                autoComplete="off"
              />

              {showAdminLink && (
                <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <button
                    onClick={() => navigate("/admin")}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold shadow-md hover:bg-primary/90 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Masuk Panel Admin
                  </button>
                  <p className="text-xs text-muted-foreground mt-2">Hanya untuk pengelola website</p>
                </div>
              )}
            </div>
          </div>
        )}

        {q && isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        )}

        {q && !isLoading && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <SearchX className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Artikel tidak ditemukan</p>
            <p className="text-sm mt-1">Coba kata kunci yang berbeda atau lebih umum.</p>
          </div>
        )}

        {q && !isLoading && articles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
