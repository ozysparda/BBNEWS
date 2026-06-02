import { useListArticles } from "@workspace/api-client-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

export function NewsTicker() {
  const { data } = useListArticles({ limit: 20 });
  const articles = data?.articles ?? [];
  const tickerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  if (articles.length === 0) return null;

  const items = articles.map((a) => a.title);

  return (
    <div
      className="bg-primary text-primary-foreground py-1.5 overflow-hidden flex items-center gap-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Label */}
      <div className="shrink-0 bg-white/20 text-primary-foreground text-[11px] font-bold px-3 py-0.5 uppercase tracking-wider whitespace-nowrap mr-3 z-10">
        🔴 TERKINI
      </div>

      {/* Scrolling text */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={tickerRef}
          className="flex gap-0 whitespace-nowrap"
          style={{
            animation: paused ? "none" : "ticker-scroll 60s linear infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {[...items, ...items].map((title, i) => (
            <span key={i} className="inline-flex items-center text-sm">
              <span className="text-white/60 mx-4">◆</span>
              <span>{title}</span>
            </span>
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
