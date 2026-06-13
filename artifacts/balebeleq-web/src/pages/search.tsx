import { useSearch, useLocation } from "wouter";
import { useListArticles } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { SEO } from "@/components/seo";
import { ArticleCard } from "@/components/article-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchX, Search, ShieldCheck } from "lucide-react";

const SECRET_CODE = "admin";

export default function SearchPage() {
  const rawSearch = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(rawSearch);
  const q = params.get("q") ?? "";

  const isAdminSecret = q === SECRET_CODE;

  const { data, isLoading } = useListArticles(
    { search: q, limit: 20 },
    { query: { enabled: q.trim().length > 0 && !isAdminSecret, queryKey: undefined as any } }
  );

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <SEO
        title={q ? `Pencarian: ${q}` : "Cari Artikel"}
        description={q ? `Hasil pencarian artikel untuk "${q}" di BerugakNews.` : "Cari artikel terkini dari BerugakNews."}
        url={`/cari?q=${encodeURIComponent(q)}`}
        keywords={q ? `${q}, berita, pencarian` : "pencarian, berita, lombok"}
      />
      <PublicLayout>
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <Search className="w-6 h-6 text-primary shrink-0" />
          <div>
            <h1 className="text-2xl font-serif font-bold">
              {q ? (isAdminSecret ? "Akses Admin" : `Hasil pencarian: "${q}"`) : "Cari Artikel"}
            </h1>
            {q && !isAdminSecret && !isLoading && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {total > 0 ? `${total} artikel ditemukan` : "Tidak ada artikel yang cocok"}
              </p>
            )}
          </div>
        </div>

        {isAdminSecret && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ShieldCheck className="w-16 h-16 mb-6 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Panel Administrasi</h2>
            <p className="text-muted-foreground text-sm mb-6">Hanya untuk pengelola resmi BerugakNews</p>
            <button
              onClick={() => navigate("/admin")}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full text-sm font-semibold shadow-md hover:bg-primary/90 transition-colors"
            >
              <ShieldCheck className="w-5 h-5" />
              Masuk Panel Admin
            </button>
          </div>
        )}

        {!q && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Search className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg">Ketik kata kunci di search bar untuk mulai mencari.</p>
          </div>
        )}

        {q && !isAdminSecret && isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        )}

        {q && !isAdminSecret && !isLoading && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <SearchX className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Artikel tidak ditemukan</p>
            <p className="text-sm mt-1">Coba kata kunci yang berbeda atau lebih umum.</p>
          </div>
        )}

        {q && !isAdminSecret && !isLoading && articles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  </>
);
}
