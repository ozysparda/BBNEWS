import { PublicLayout } from "@/components/layout/public-layout";
import { useGetFeaturedArticles, useListArticles, useListCategories } from "@workspace/api-client-react";
import { ArticleCard } from "@/components/article-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: featuredArticles, isLoading: loadingFeatured } = useGetFeaturedArticles();
  const { data: recentArticlesData, isLoading: loadingRecent } = useListArticles({ limit: 12 });
  const { data: categories } = useListCategories();

  return (
    <PublicLayout>
      {/* Featured Section */}
      <section className="bg-background py-8 border-b border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Sorotan Utama
          </h2>
          
          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <Skeleton className="h-[400px] md:h-[500px] md:col-span-8 rounded-xl" />
              <div className="md:col-span-4 flex flex-col gap-6">
                <Skeleton className="h-[240px] rounded-xl" />
                <Skeleton className="h-[240px] rounded-xl" />
              </div>
            </div>
          ) : featuredArticles && featuredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8">
                <ArticleCard article={featuredArticles[0]} featured />
              </div>
              <div className="md:col-span-4 flex flex-col gap-6">
                {featuredArticles.slice(1, 3).map(article => (
                  <div key={article.id} className="flex-1">
                    <ArticleCard article={article} featured />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
              Belum ada artikel sorotan.
            </div>
          )}
        </div>
      </section>

      {/* Latest News */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-serif font-bold text-foreground">Berita Terbaru</h2>
              <p className="text-muted-foreground mt-2">Informasi terkini dari sekitar Anda.</p>
            </div>
          </div>

          {loadingRecent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[200px] rounded-xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : recentArticlesData?.articles && recentArticlesData.articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentArticlesData.articles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-muted/30 rounded-xl border border-border">
              <p className="text-muted-foreground">Belum ada artikel yang diterbitkan.</p>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
