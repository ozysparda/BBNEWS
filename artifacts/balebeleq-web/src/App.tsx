import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ArticleDetail from "@/pages/article-detail";
import CategoryPage from "@/pages/category-page";
import SearchPage from "@/pages/search";

import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminArticleList from "@/pages/admin/article-list";
import AdminArticleForm from "@/pages/admin/article-form";
import AdminCategoryList from "@/pages/admin/category-list";
import AdminUserManagement from "@/pages/admin/user-management";

setAuthTokenGetter(() => localStorage.getItem("admin_token"));

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/berita/:slug" component={ArticleDetail} />
      <Route path="/kategori/:slug" component={CategoryPage} />
      <Route path="/cari" component={SearchPage} />
      
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/artikel" component={AdminArticleList} />
      <Route path="/admin/artikel/baru" component={AdminArticleForm} />
      <Route path="/admin/artikel/:id/edit" component={AdminArticleForm} />
      <Route path="/admin/kategori" component={AdminCategoryList} />
      <Route path="/admin/pengguna" component={AdminUserManagement} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
