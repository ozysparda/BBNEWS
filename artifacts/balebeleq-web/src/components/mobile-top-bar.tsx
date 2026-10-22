import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const HOME_PATHS = ["/", "/home"];

export function MobileTopBar() {
  const [location, navigate] = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1 && !HOME_PATHS.includes(location));
  }, [location]);

  const isHome = HOME_PATHS.includes(location);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      {canGoBack ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Kembali"
          className="shrink-0"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else navigate("/");
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      ) : (
        <div className="w-10 shrink-0" />
      )}
      <div className="flex flex-1 items-center justify-center gap-2">
        <span className="truncate font-serif text-base font-bold text-primary">
          {isHome ? "BerugakNews" : getPageTitle(location)}
        </span>
      </div>
      <ThemeToggle />
    </header>
  );
}

function getPageTitle(path: string): string {
  if (path.startsWith("/berita/")) return "Berita";
  if (path.startsWith("/kategori/")) return "Kategori";
  if (path === "/cari") return "Pencarian";
  if (path.startsWith("/donasi")) return "Donasi";
  if (path.startsWith("/aduan")) return "Aduan";
  return "BerugakNews";
}