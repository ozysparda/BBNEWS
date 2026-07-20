import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
  totalComments: number;
  totalComplaints: number;
  complaintsByStatus: Record<string, number>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const { isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const token = localStorage.getItem('admin_token');
      try {
        const articlesRes = await fetch('/api/articles/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!articlesRes.ok) throw new Error('Failed to fetch article stats');
        const articleStats = await articlesRes.json();

        const complaintsRes = await fetch('/api/admin/complaints?limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!complaintsRes.ok) throw new Error('Failed to fetch complaints');
        const complaintStats = await complaintsRes.json();

        const commentsRes = await fetch('/api/admin/comments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!commentsRes.ok) throw new Error('Failed to fetch comments');
        const comments = await commentsRes.json();

        setStats({
          totalArticles: articleStats.total,
          publishedArticles: articleStats.published,
          draftArticles: articleStats.draft,
          totalViews: articleStats.totalViews,
          totalComments: comments.length,
          totalComplaints: complaintStats.total,
          complaintsByStatus: {
            pending: complaintStats.complaints?.filter((c: any) => c.status === 'pending').length || 0,
            verified: complaintStats.complaints?.filter((c: any) => c.status === 'verified').length || 0,
            in_progress: complaintStats.complaints?.filter((c: any) => c.status === 'in_progress').length || 0,
            completed: complaintStats.complaints?.filter((c: any) => c.status === 'completed').length || 0,
          },
        });

        return stats;
      } catch (error) {
        toast.error('Gagal memuat statistik');
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const complaintChartData = [
    { name: 'Pending', value: stats.complaintsByStatus.pending, fill: '#f59e0b' },
    { name: 'Verified', value: stats.complaintsByStatus.verified, fill: '#3b82f6' },
    { name: 'In Progress', value: stats.complaintsByStatus.in_progress, fill: '#a855f7' },
    { name: 'Completed', value: stats.complaintsByStatus.completed, fill: '#10b981' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Selamat datang di panel administrasi</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Artikel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalArticles}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.publishedArticles} dipublikasikan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Semua artikel</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Komentar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComments}</div>
            <p className="text-xs text-gray-500 mt-1">Dari pembaca</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Aduan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalComplaints}</div>
            <p className="text-xs text-gray-500 mt-1">Dari masyarakat</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Aduan</CardTitle>
            <CardDescription>Distribusi status aduan masyarakat</CardDescription>
          </CardHeader>
          <CardContent>
            {complaintChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={complaintChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {complaintChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Tidak ada data aduan
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perbandingan Konten</CardTitle>
            <CardDescription>Artikel dipublikasikan vs draft</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[{ name: 'Artikel', published: stats.publishedArticles, draft: stats.draftArticles }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="published" fill="#10b981" name="Dipublikasikan" />
                <Bar dataKey="draft" fill="#ef4444" name="Draft" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
