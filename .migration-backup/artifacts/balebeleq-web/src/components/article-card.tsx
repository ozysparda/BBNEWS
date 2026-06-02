import { Link } from "wouter";
import { formatDateTime } from "@/lib/format-date";
import type { Article } from "@workspace/api-client-react";
import { Eye } from "lucide-react";

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
}

export function ArticleCard({ article, featured = false }: ArticleCardProps) {
  if (featured) {
    return (
      <Link href={`/berita/${article.slug}`} className="group block h-full">
        <article className="relative h-[400px] md:h-[500px] rounded-xl overflow-hidden shadow-lg border border-border/50">
          {article.imageUrl ? (
            <img 
              src={article.imageUrl} 
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground font-serif text-xl opacity-50">BaleBeleqNews</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            {article.category && (
              <span 
                className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 text-white"
                style={{ backgroundColor: article.category.color || 'var(--color-primary)' }}
              >
                {article.category.name}
              </span>
            )}
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-white mb-3 leading-tight group-hover:text-primary-foreground transition-colors line-clamp-3">
              {article.title}
            </h2>
            <div className="flex items-center gap-4 text-white/70 text-sm">
              <time dateTime={article.createdAt}>{formatDateTime(article.createdAt)}</time>
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                {article.viewCount}
              </div>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/berita/${article.slug}`} className="group block h-full">
      <article className="h-full flex flex-col bg-card rounded-lg overflow-hidden border border-border hover-elevate transition-all duration-300">
        <div className="aspect-[16/9] relative overflow-hidden bg-muted">
          {article.imageUrl ? (
            <img 
              src={article.imageUrl} 
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-muted-foreground font-serif opacity-50">BaleBeleqNews</span>
            </div>
          )}
          {article.category && (
            <span 
              className="absolute top-4 left-4 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
              style={{ backgroundColor: article.category.color || 'var(--color-primary)' }}
            >
              {article.category.name}
            </span>
          )}
        </div>
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="text-xl font-serif font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-3">
            {article.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
            {article.excerpt}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border/50">
            <time dateTime={article.createdAt}>{formatDateTime(article.createdAt)}</time>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {article.viewCount}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
