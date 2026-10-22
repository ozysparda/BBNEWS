import { Switch, Route } from 'wouter';
import Home from './home';
import ArticleDetail from './article-detail';
import CategoryPage from './category-page';
import SearchPage from './search';
import AdminLayout from './admin';
import NotFound from './not-found';
import ComplaintPage from './complaint-page';

export { ComplaintPage, AdminLayout, Home, ArticleDetail, CategoryPage, SearchPage, NotFound };

export const pageRoutes = (
  <Switch>
    <Route path="/" component={Home} />
    <Route path="/berita/:slug" component={ArticleDetail} />
    <Route path="/kategori/:slug" component={CategoryPage} />
    <Route path="/cari" component={SearchPage} />
    <Route path="/aduan" component={ComplaintPage} />
    <Route path="/admin/*" component={AdminLayout} />
    <Route component={NotFound} />
  </Switch>
);
