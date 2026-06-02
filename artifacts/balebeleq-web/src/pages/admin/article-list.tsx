import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  useListAllArticles,
  useDeleteArticle,
  getListAllArticlesQueryKey,
  getListArticlesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, FileText, CheckCircle2, Edit3 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export default function AdminArticleList() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListAllArticles({ page: 1, limit: 200 });
  const deleteMutation = useDeleteArticle();

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Artikel berhasil dihapus" });
          queryClient.invalidateQueries({ queryKey: getListAllArticlesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListArticlesQueryKey() });
          setDeleteId(null);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Gagal menghapus artikel" });
          setDeleteId(null);
        }
      }
    );
  };

  const allArticles = data?.articles ?? [];
  const filtered = allArticles.filter((a) => {
    const matchFilter =
      filter === "all" ||
      (filter === "published" && a.isPublished) ||
      (filter === "draft" && !a.isPublished);
    const matchSearch = !search || a.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const publishedCount = allArticles.filter((a) => a.isPublished).length;
  const draftCount = allArticles.filter((a) => !a.isPublished).length;

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Kelola Artikel</h1>
          <p className="text-muted-foreground mt-1">Daftar semua artikel — terbit dan draft.</p>
        </div>
        <Link href="/admin/artikel/baru" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
          <Plus className="w-4 h-4 mr-2" />
          Tulis Artikel Baru
        </Link>
      </div>

      {/* Quick stat pills */}
      <div className="flex flex-wrap gap-3 mb-5">
        <button
          onClick={() => setFilter("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}
        >
          <FileText className="w-3.5 h-3.5" />
          Semua <span className="font-bold">{allArticles.length}</span>
        </button>
        <button
          onClick={() => setFilter("published")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${filter === "published" ? "bg-emerald-500 text-white border-emerald-500" : "bg-background border-border hover:bg-muted"}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Terbit <span className="font-bold">{publishedCount}</span>
        </button>
        <button
          onClick={() => setFilter("draft")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${filter === "draft" ? "bg-amber-500 text-white border-amber-500" : "bg-background border-border hover:bg-muted"}`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Draft <span className="font-bold">{draftCount}</span>
        </button>
        <div className="ml-auto w-full sm:w-auto">
          <Input
            placeholder="Cari judul artikel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-64"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[600px]">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3">Judul Artikel</th>
                <th className="px-4 py-3 hidden sm:table-cell">Kategori</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden md:table-cell">Tanggal</th>
                <th className="px-4 py-3 hidden md:table-cell">Views</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-10" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? `Tidak ada artikel dengan kata kunci "${search}"` : "Belum ada artikel."}
                  </td>
                </tr>
              ) : (
                filtered.map((article) => (
                  <tr key={article.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground max-w-[220px] truncate">
                      {article.title}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {article.category ? (
                        <Badge variant="outline" className="capitalize text-xs">{article.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {article.isPublished ? (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-xs">Terbit</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Draft</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs hidden md:table-cell">
                      {format(new Date(article.createdAt), "dd MMM yyyy", { locale: id })}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="w-3 h-3" />
                        <span className="font-mono text-xs">{article.viewCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/artikel/${article.id}/edit`}
                          className="inline-flex items-center justify-center rounded-md text-sm transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 w-8"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setDeleteId(article.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Artikel?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Artikel akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
