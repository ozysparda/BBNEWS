import { useSearch, useLocation } from "wouter";
import { useListArticles } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { ArticleCard } from "@/components/article-card";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchX, Search } from "lucide-react";

export default function SearchPage() {
  const rawSearch = useSearch();
  const params = new URLSearchParams(rawSearch);
  const q = params.get("q") ?? "";

  const { data, isLoading } = useListArticles(
    { search: q, limit: 20 },
    { query: { enabled: q.trim().length > 0 } }
  );

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;

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
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Search className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg">Ketik kata kunci di search bar untuk mulai mencari.</p>
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
