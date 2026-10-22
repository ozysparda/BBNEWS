import { useListArticles } from "@workspace/api-client-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Flame } from "lucide-react";

export function NewsTicker() {
  const { data } = useListArticles({ limit: 20 });
  const articles = data?.articles ?? [];
  const tickerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  if (articles.length === 0) return null;

  const items = articles.map((a) => ({ title: a.title, slug: a.slug }));

  return (
    <div
      className="bg-primary text-primary-foreground overflow-hidden flex items-center gap-0 border-b border-primary/20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* Label */}
      <div className="shrink-0 flex items-center gap-1.5 bg-primary-foreground/20 text-primary-foreground text-[11px] font-bold px-3 sm:px-4 py-2.5 uppercase tracking-wider whitespace-nowrap z-10">
        <Flame className="h-3.5 w-3.5" />
        TERKINI
      </div>

      {/* Scrolling text */}
      <div className="flex-1 overflow-hidden relative py-2.5">
        <div
          ref={tickerRef}
          className="flex items-center whitespace-nowrap"
          style={{
            animation: paused ? "none" : "ticker-scroll 50s linear infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {[...items, ...items].map((item, i) => (
            <Link
              key={i}
              href={`/berita/${item.slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity shrink-0"
            >
              <span className="text-primary-foreground/40 mx-4">◆</span>
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}