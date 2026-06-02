import { useEffect, useRef } from "react";
import { useParams } from "wouter";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useGetArticleBySlug, getGetArticleBySlugQueryKey, useIncrementArticleViews } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, User } from "lucide-react";

export default function ArticleDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: article, isLoading, isError } = useGetArticleBySlug(slug as string, {
    query: {
      enabled: !!slug,
      queryKey: getGetArticleBySlugQueryKey(slug as string)
    }
  });

  const incrementViews = useIncrementArticleViews();
  const incrementedRef = useRef(false);

  useEffect(() => {
    if (article?.id && !incrementedRef.current) {
      incrementedRef.current = true;
      incrementViews.mutate({ id: article.id });
    }
  }, [article?.id, incrementViews]);

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Skeleton className="h-10 w-3/4 mb-6" />
          <div className="flex gap-4 mb-8">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (isError || !article) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-serif mb-4">Artikel Tidak Ditemukan</h1>
          <p className="text-muted-foreground">Maaf, artikel yang Anda cari tidak tersedia atau telah dihapus.</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <article className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-10 text-center">
          {article.category && (
            <Badge 
              className="mb-6 font-semibold"
              style={article.category.color ? { backgroundColor: article.category.color, color: 'white' } : {}}
            >
              {article.category.name}
            </Badge>
          )}
          
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight mb-6">
            {article.title}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-6 text-muted-foreground text-sm font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(article.createdAt), "dd MMMM yyyy", { locale: id })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>{article.viewCount} Dilihat</span>
            </div>
          </div>
        </header>

        {article.imageUrl && (
          <div className="mb-12 rounded-2xl overflow-hidden shadow-lg border border-border">
            <img 
              src={article.imageUrl} 
              alt={article.title} 
              className="w-full h-auto object-cover max-h-[600px]"
            />
          </div>
        )}

        <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-serif prose-a:text-primary hover:prose-a:text-primary/80">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>
      </article>
    </PublicLayout>
  );
}
