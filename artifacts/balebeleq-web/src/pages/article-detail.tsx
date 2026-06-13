import { useEffect, useRef } from "react";
import { useParams } from "wouter";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useGetArticleBySlug, getGetArticleBySlugQueryKey, useIncrementArticleViews } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { SEO } from "@/components/seo";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, Copy, Check } from "lucide-react";
import { FaFacebook, FaWhatsapp, FaTwitter } from "react-icons/fa";
import { useState } from "react";

function ShareButtons({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + url)}`;
  const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;

  return (
    <div className="flex flex-wrap items-center gap-3 mt-8 pt-8 border-t border-border">
      <span className="text-sm font-semibold text-muted-foreground">Bagikan:</span>
      <a
        href={fbUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-[#1877F2] text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <FaFacebook className="w-4 h-4" />
        Facebook
      </a>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <FaWhatsapp className="w-4 h-4" />
        WhatsApp
      </a>
      <a
        href={twUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <FaTwitter className="w-4 h-4" />
        Twitter/X
      </a>
      <button
        onClick={copyLink}
        className="flex items-center gap-2 bg-muted text-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-muted/80 transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        {copied ? "Tersalin!" : "Salin Link"}
      </button>
    </div>
  );
}

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

  const articleUrl = typeof window !== "undefined" ? window.location.href : "";

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
    <>
      <SEO
        title={article.title}
        description={article.excerpt}
        image={article.imageUrl || undefined}
        url={`/berita/${article.slug}`}
        type="article"
        publishedTime={article.createdAt}
        author={article.category?.name || "BerugakNews"}
        articleSection={article.category?.name}
        keywords={article.category?.name ? `${article.category.name}, berita, lombok, berugak` : "berita, lombok, berugak"}
      />
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
              {(article as any).imageCaption && (
                <p className="text-xs text-center text-muted-foreground bg-muted/50 px-4 py-2 italic">
                  {(article as any).imageCaption}
                </p>
              )}
            </div>
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-serif prose-a:text-primary hover:prose-a:text-primary/80">
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>

          <ShareButtons title={article.title} url={articleUrl} />
        </article>
      </PublicLayout>
    </>
  );
}
