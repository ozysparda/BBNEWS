import { Link } from "wouter";
import { formatDateTime } from "@/lib/format-date";
import type { Article } from "@workspace/api-client-react";
import { Eye, Clock } from "lucide-react";

interface ArticleCardProps {
  article: Article;
  featured?: boolean;
  featuredSmall?: boolean;
}

export function ArticleCard({ article, featured = false, featuredSmall = false }: ArticleCardProps) {
  // Large featured hero card
  if (featured) {
    return (
      <Link href={`/berita/${article.slug}`} className="group block h-full">
        <article className="relative h-[280px] sm:h-[400px] md:h-[460px] rounded-xl overflow-hidden shadow-lg border border-border/50">
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-primary/30 font-serif text-2xl font-bold">BerugakNews</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
            {article.category && (
              <span
                className="inline-block px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 sm:mb-3 text-white"
                style={{ backgroundColor: article.category.color || 'var(--color-primary)' }}
              >
                {article.category.name}
              </span>
            )}
            <h2 className="text-lg sm:text-2xl md:text-4xl font-serif font-bold text-white mb-2 sm:mb-3 leading-tight group-hover:text-primary-foreground transition-colors line-clamp-3">
              {article.title}
            </h2>
            <div className="flex items-center gap-3 text-white/60 text-xs sm:text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <time dateTime={article.createdAt}>{formatDateTime(article.createdAt)}</time>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{article.viewCount}</span>
              </div>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  // Small featured side card
  if (featuredSmall) {
    return (
      <Link href={`/berita/${article.slug}`} className="group block h-full">
        <article className="relative h-[200px] sm:h-full min-h-[160px] rounded-xl overflow-hidden shadow-md border border-border/50">
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-primary/30 font-serif text-sm">BerugakNews</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {article.category && (
              <span
                className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-2 text-white"
                style={{ backgroundColor: article.category.color || 'var(--color-primary)' }}
              >
                {article.category.name}
              </span>
            )}
            <h3 className="text-sm sm:text-base font-serif font-bold text-white leading-snug group-hover:text-primary-foreground line-clamp-2">
              {article.title}
            </h3>
            <div className="flex items-center gap-1.5 text-white/50 text-xs mt-1.5">
              <Clock className="w-3 h-3" />
              <time dateTime={article.createdAt}>{formatDateTime(article.createdAt)}</time>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  // Regular card
  return (
    <Link href={`/berita/${article.slug}`} className="group block h-full">
      <article className="h-full flex flex-col bg-card rounded-xl overflow-hidden border border-border hover:shadow-md hover:border-primary/30 transition-all duration-300">
        <div className="aspect-[16/9] relative overflow-hidden bg-muted">
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <span className="text-primary/30 font-serif text-sm">BerugakNews</span>
            </div>
          )}
          {article.category && (
            <span
              className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
              style={{ backgroundColor: article.category.color || 'var(--color-primary)' }}
            >
              {article.category.name}
            </span>
          )}
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="text-base sm:text-lg font-serif font-bold text-foreground mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-3">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 mb-3 flex-1 leading-relaxed">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50 mt-auto">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <time dateTime={article.createdAt}>{formatDateTime(article.createdAt)}</time>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{article.viewCount}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
