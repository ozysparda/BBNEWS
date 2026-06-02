import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, FileText, Tags, LogOut } from "lucide-react";
import logoImg from "/logo.png";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-muted/30">Memuat...</div>;
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/artikel", label: "Artikel", icon: FileText },
    { href: "/admin/kategori", label: "Kategori", icon: Tags },
  ];

  return (
    <div className="min-h-screen flex bg-muted/20">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border gap-2">
          <img src={logoImg} alt="Logo" className="h-8 w-8 object-contain" />
          <span className="font-serif font-bold text-lg text-sidebar-primary">Bale Beleq Admin</span>
        </div>
        <div className="p-4 flex-1">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-4 px-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm">
              <div className="font-medium text-sidebar-foreground">{user.username}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-background border-b border-border flex items-center px-6 gap-3 md:hidden">
          <img src={logoImg} alt="Logo" className="h-8 w-8 object-contain" />
          <span className="font-serif font-bold text-xl text-primary">Bale Beleq Admin</span>
        </header>
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
