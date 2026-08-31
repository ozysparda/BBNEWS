import { Switch, Route, useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Layers,
  MessageSquare,
  Users,
  AlertCircle,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminLogin from './login';
import AdminDashboardStats from './dashboard-stats';
import AdminArticleList from './article-list';
import AdminArticleForm from './article-form';
import AdminCategoryList from './category-list';
import AdminUserManagement from './user-management';
import AdminProfile from './profile';
import AdminSitePages from './site-pages';
import AdminCommentList from './comment-list';
import ComplaintManagement from './complaint-list';

const MENU_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Artikel', icon: FileText, path: '/admin/artikel' },
  { label: 'Kategori', icon: Layers, path: '/admin/kategori' },
  { label: 'Komentar', icon: MessageSquare, path: '/admin/komentar' },
  { label: 'Aduan', icon: AlertCircle, path: '/admin/aduan' },
  { label: 'Pengguna', icon: Users, path: '/admin/pengguna' },
  { label: 'Halaman', icon: FileText, path: '/admin/halaman' },
  { label: 'Profil', icon: Users, path: '/admin/profil' },
  { label: 'Pengaturan', icon: Settings, path: '/admin/pengaturan' },
];

export default function AdminLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setLocation('/admin');
  };

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-slate-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold">BBNEWS Admin</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className="w-full justify-start text-gray-200 hover:bg-slate-800"
                onClick={() => setLocation(item.path)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start text-red-400 hover:bg-red-900/20">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <h2 className="text-lg font-semibold">Panel Administrasi</h2>
          <div className="w-8" />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          <Switch>
            <Route path="/admin/dashboard" component={AdminDashboardStats} />
            <Route path="/admin/artikel" component={AdminArticleList} />
            <Route path="/admin/artikel/baru" component={AdminArticleForm} />
            <Route path="/admin/artikel/:id/edit" component={AdminArticleForm} />
            <Route path="/admin/kategori" component={AdminCategoryList} />
            <Route path="/admin/komentar" component={AdminCommentList} />
            <Route path="/admin/aduan" component={ComplaintManagement} />
            <Route path="/admin/pengguna" component={AdminUserManagement} />
            <Route path="/admin/halaman" component={AdminSitePages} />
            <Route path="/admin/profil" component={AdminProfile} />
            <Route path="/admin" component={AdminDashboardStats} />
          </Switch>
        </div>
      </div>
    </div>
  );
}
