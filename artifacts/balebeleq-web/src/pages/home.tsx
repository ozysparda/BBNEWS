import { PublicLayout } from "@/components/layout/public-layout";
import { useGetFeaturedArticles, useListArticles, useListCategories } from "@workspace/api-client-react";
import { ArticleCard } from "@/components/article-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ChevronRight, Flame } from "lucide-react";
import { NewsTicker } from "@/components/news-ticker";
const bannerImg = `${import.meta.env.BASE_URL}banner.png`;

export default function Home() {
  const { data: featuredArticles, isLoading: loadingFeatured } = useGetFeaturedArticles();
  const { data: recentArticlesData, isLoading: loadingRecent } = useListArticles({ limit: 12 });
  const { data: categories } = useListCategories();

  return (
    <PublicLayout>
      {/* News Ticker */}
      <NewsTicker />

      {/* Hero Banner */}
      <div className="w-full overflow-hidden max-h-48 sm:max-h-64 relative">
        <img
          src={bannerImg}
          alt="BaleBeleqNews Banner"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
      </div>

      {/* Category Quick Links */}
      {categories && categories.length > 0 && (
        <div className="bg-primary text-primary-foreground py-2 overflow-x-auto">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-xs font-bold uppercase tracking-widest opacity-70 mr-2 shrink-0">Kategori:</span>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/kategori/${cat.slug}`}
                  className="px-3 py-1 rounded-full text-xs font-semibold hover:bg-white/20 transition-colors whitespace-nowrap"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Featured Section */}
      <section className="bg-background py-6 sm:py-10 border-b border-border">
        <div className="container mx-auto px-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-5 flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Sorotan Utama
          </h2>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <Skeleton className="h-[300px] md:h-[460px] md:col-span-8 rounded-xl" />
              <div className="md:col-span-4 flex flex-col gap-4">
                <Skeleton className="h-[220px] rounded-xl" />
                <Skeleton className="h-[220px] rounded-xl" />
              </div>
            </div>
          ) : featuredArticles && featuredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-8">
                <ArticleCard article={featuredArticles[0]} featured />
              </div>
              <div className="md:col-span-4 flex flex-col gap-4">
                {featuredArticles.slice(1, 3).map(article => (
                  <div key={article.id} className="flex-1">
                    <ArticleCard article={article} featuredSmall />
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
      <section className="py-8 sm:py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Berita Terbaru</h2>
              <div className="h-1 w-16 bg-primary rounded mt-2" />
            </div>
          </div>

          {loadingRecent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex flex-col space-y-3">
                  <Skeleton className="h-[180px] rounded-xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : recentArticlesData?.articles && recentArticlesData.articles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
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

      {/* Category Browse */}
      {categories && categories.length > 0 && (
        <section className="py-8 sm:py-12 bg-muted/30 border-t border-border">
          <div className="container mx-auto px-4">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground mb-6">Jelajahi Kategori</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/kategori/${cat.slug}`}
                  className="group flex flex-col items-center justify-center p-4 bg-card rounded-xl border border-border hover:border-primary hover:shadow-md transition-all duration-200 text-center"
                >
                  <div
                    className="w-10 h-10 rounded-full mb-2 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: cat.color || 'var(--color-primary)' }}
                  />
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {cat.name}
                  </span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground mt-1 group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}
