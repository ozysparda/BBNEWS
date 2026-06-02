import { useGetArticleStats, useListAllArticles, getGetArticleStatsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, CheckCircle2, Edit3, Plus, Tags, TrendingUp, BarChart2 } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetArticleStats({
    query: { queryKey: getGetArticleStatsQueryKey() }
  });
  const { data: allArticlesData } = useListAllArticles({ page: 1, limit: 200 });

  const recentArticles = (allArticlesData?.articles ?? [])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const topViewed = (allArticlesData?.articles ?? [])
    .filter((a) => a.isPublished)
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 5);

  const maxCategoryCount = stats ? Math.max(...stats.byCategory.map((c) => c.count), 1) : 1;

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Ringkasan & analitik konten BaleBeleqNews.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/admin/kategori" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            <Tags className="w-4 h-4 mr-2" />
            Kategori
          </Link>
          <Link href="/admin/artikel" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
            <FileText className="w-4 h-4 mr-2" />
            Artikel
          </Link>
          <Link href="/admin/artikel/baru" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
            <Plus className="w-4 h-4 mr-2" />
            Tulis Artikel
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent><Skeleton className="h-8 w-16 mt-2" /></CardContent>
            </Card>
          ))
        ) : stats ? (
          <>
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Artikel</CardTitle>
                <FileText className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">Semua artikel</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Terbit</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold text-emerald-600">{stats.published}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0}% dari total
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Draft</CardTitle>
                <Edit3 className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold text-amber-600">{stats.draft}</div>
                <p className="text-xs text-muted-foreground mt-1">Belum diterbitkan</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold text-blue-600">{stats.totalViews.toLocaleString("id-ID")}</div>
                <p className="text-xs text-muted-foreground mt-1">Akumulasi pembaca</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {/* Charts & Tables Row */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Category breakdown bar chart */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-4">
            <BarChart2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Artikel per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : stats && stats.byCategory.length > 0 ? (
              <div className="space-y-3">
                {stats.byCategory
                  .sort((a, b) => b.count - a.count)
                  .map((item, index) => {
                    const pct = Math.round((item.count / maxCategoryCount) * 100);
                    const colors = ["bg-primary", "bg-emerald-500", "bg-amber-500", "bg-blue-500", "bg-purple-500", "bg-pink-500"];
                    return (
                      <div key={index}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium capitalize">{item.categoryName}</span>
                          <span className="text-muted-foreground font-mono">{item.count} artikel</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${colors[index % colors.length]} transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">Belum ada data kategori.</div>
            )}
          </CardContent>
        </Card>

        {/* Top viewed articles */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Artikel Terpopuler</CardTitle>
          </CardHeader>
          <CardContent>
            {topViewed.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Belum ada data.</div>
            ) : (
              <div className="space-y-3">
                {topViewed.map((article, i) => (
                  <div key={article.id} className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/artikel/${article.id}/edit`} className="text-sm font-medium text-foreground hover:text-primary line-clamp-2 leading-snug">
                        {article.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Eye className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-mono">{article.viewCount?.toLocaleString("id-ID") ?? 0} views</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Articles */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-4">
          <FileText className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Artikel Terbaru</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentArticles.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Belum ada artikel.</div>
          ) : (
            <div className="divide-y divide-border">
              {recentArticles.map((article) => (
                <div key={article.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <Link href={`/admin/artikel/${article.id}/edit`} className="text-sm font-medium text-foreground hover:text-primary truncate block">
                      {article.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(article.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {article.isPublished ? (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Terbit</span>
                    ) : (
                      <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Draft</span>
                    )}
                    <Link href={`/admin/artikel/${article.id}/edit`} className="text-xs text-primary hover:underline">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
