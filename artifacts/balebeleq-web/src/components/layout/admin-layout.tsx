import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, FileText, Tags, LogOut, Menu, X, Home } from "lucide-react";
import { useState } from "react";
const logoImg = `${import.meta.env.BASE_URL}logo.png`;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <img src={logoImg} alt="Logo" className="h-12 w-12 object-contain animate-pulse" />
          <span className="text-sm text-muted-foreground">Memuat...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/artikel", label: "Artikel", icon: FileText },
    { href: "/admin/kategori", label: "Kategori", icon: Tags },
  ];

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const active = location === item.href || location.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen flex bg-muted/20">
      {/* Desktop Sidebar */}
      <aside className="w-60 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col shrink-0">
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-2.5">
          <img src={logoImg} alt="Logo" className="h-9 w-9 object-contain" />
          <div>
            <div className="font-serif font-bold text-sm text-sidebar-primary leading-tight">Bale Beleq</div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest">Admin Panel</div>
          </div>
        </div>
        <div className="p-3 flex-1">
          <div className="mb-2 px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Menu</div>
          <nav className="space-y-1">
            <NavLinks />
          </nav>
          <div className="mt-4 pt-4 border-t border-sidebar-border">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Home className="w-4 h-4 shrink-0" />
              Lihat Website
            </Link>
          </div>
        </div>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-sidebar-foreground truncate">{user.username}</div>
              <div className="text-[10px] text-muted-foreground">Administrator</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-sidebar z-50 md:hidden flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2.5">
                <img src={logoImg} alt="Logo" className="h-8 w-8 object-contain" />
                <span className="font-serif font-bold text-sm text-sidebar-primary">Admin Panel</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-md hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 flex-1">
              <nav className="space-y-1">
                <NavLinks />
              </nav>
              <div className="mt-4 pt-4 border-t border-sidebar-border">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Lihat Website
                </Link>
              </div>
            </div>
            <div className="p-3 border-t border-sidebar-border">
              <div className="flex items-center gap-3 px-3 py-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-sidebar-foreground truncate">{user.username}</div>
                  <div className="text-[10px] text-muted-foreground">Administrator</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Mobile top bar */}
        <header className="h-14 bg-background border-b border-border flex items-center px-4 gap-3 md:hidden sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <img src={logoImg} alt="Logo" className="h-7 w-7 object-contain" />
          <span className="font-serif font-bold text-base text-primary">Bale Beleq Admin</span>
          <div className="ml-auto">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
