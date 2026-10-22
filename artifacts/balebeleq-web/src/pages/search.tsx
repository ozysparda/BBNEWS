import { useSearch, useLocation } from "wouter";
import { useListArticles } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { SEO } from "@/components/seo";
import { ArticleCard } from "@/components/article-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { SearchX, Search } from "lucide-react";

export default function SearchPage() {
  const rawSearch = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(rawSearch);
  const q = params.get("q") ?? "";

  const { data, isLoading } = useListArticles(
    { search: q, limit: 20 },
    { query: { enabled: q.trim().length > 0, queryKey: undefined as any } }
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
        <div className="container mx-auto px-4 py-8 sm:py-12 max-w-5xl">
          <div className="mb-6 sm:mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold sm:text-3xl">
                {q ? `Hasil pencarian: "${q}"` : "Cari Artikel"}
              </h1>
              {q && !isLoading && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {total > 0 ? `${total} artikel ditemukan` : "Tidak ada artikel yang cocok"}
                </p>
              )}
            </div>
          </div>

          {!q && (
            <EmptyState
              icon={Search}
              title="Cari Artikel"
              description="Ketik kata kunci di search bar di atas untuk mulai mencari artikel."
            />
          )}

          {q && isLoading && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-xl" />
              ))}
            </div>
          )}

          {q && !isLoading && articles.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="Artikel tidak ditemukan"
              description="Coba kata kunci yang berbeda atau lebih umum."
            />
          )}

          {q && !isLoading && articles.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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