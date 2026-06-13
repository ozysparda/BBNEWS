import { useParams } from "wouter";
import { useListCategories, useListArticles, getListArticlesQueryKey } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { SEO } from "@/components/seo";
import { ArticleCard } from "@/components/article-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: categories, isLoading: loadingCategories } = useListCategories();
  
  const category = categories?.find(c => c.slug === slug);
  const categoryId = category?.id;

  const { data: articlesData, isLoading: loadingArticles } = useListArticles(
    { categoryId },
    { query: { enabled: !!categoryId, queryKey: getListArticlesQueryKey({ categoryId }) } }
  );

  return (
    <>
      <SEO
        title={category ? `Berita ${category.name}` : "Kategori"}
        description={category ? `Kumpulan berita ${category.name} terkini dari BerugakNews.` : "Jelajahi kategori berita di BerugakNews."}
        url={category ? `/kategori/${category.slug}` : `/kategori/${slug}`}
        keywords={category ? `${category.name}, berita ${category.name}, lombok` : "kategori, berita, lombok"}
      />
      <PublicLayout>
      <div className="bg-muted/30 border-b border-border py-12">
        <div className="container mx-auto px-4 text-center">
          {loadingCategories ? (
            <Skeleton className="h-10 w-48 mx-auto mb-4" />
          ) : category ? (
            <>
              <div 
                className="w-16 h-1 mx-auto mb-6 rounded-full" 
                style={{ backgroundColor: category.color || 'hsl(var(--primary))' }} 
              />
              <h1 className="text-4xl font-serif font-bold text-foreground capitalize mb-4">
                Kategori: {category.name}
              </h1>
            </>
          ) : (
            <h1 className="text-4xl font-serif font-bold text-foreground mb-4">
              Kategori Tidak Ditemukan
            </h1>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {loadingArticles || loadingCategories ? (
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
        ) : !category ? (
          <div className="text-center py-20 text-muted-foreground">
            Kategori ini tidak tersedia.
          </div>
        ) : articlesData?.articles && articlesData.articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {articlesData.articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground text-lg">Belum ada artikel dalam kategori ini.</p>
          </div>
        )}
      </div>
    </PublicLayout>
  </>
);
}
