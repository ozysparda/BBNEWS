import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  useListAdminComments,
  useDeleteAdminComment,
  getListAdminCommentsQueryKey,
} from "@workspace/api-client-react";
import type { AdminComment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Eye, MessageSquare } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function AdminCommentList() {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [detailComment, setDetailComment] = useState<AdminComment | null>(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments, isLoading } = useListAdminComments();
  const deleteMutation = useDeleteAdminComment();

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Komentar berhasil dihapus" });
          queryClient.invalidateQueries({ queryKey: getListAdminCommentsQueryKey() });
          setDeleteId(null);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Gagal menghapus komentar" });
          setDeleteId(null);
        },
      }
    );
  };

  const allComments = comments ?? [];
  const filtered = allComments.filter((c) => {
    const term = search.toLowerCase();
    return (
      !term ||
      c.email.toLowerCase().includes(term) ||
      c.content.toLowerCase().includes(term) ||
      (c.articleTitle ?? "").toLowerCase().includes(term)
    );
  });

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Kelola Komentar</h1>
          <p className="text-muted-foreground mt-1">
            Lihat detail pengirim dan hapus komentar yang tidak pantas.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-border bg-background">
          <MessageSquare className="w-3.5 h-3.5" />
          Total <span className="font-bold">{allComments.length}</span>
        </div>
        <div className="ml-auto w-full sm:w-auto">
          <Input
            placeholder="Cari email, isi, atau judul artikel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-72"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[700px]">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
              <tr>
                <th className="px-4 py-3">Artikel</th>
                <th className="px-4 py-3">Pengirim</th>
                <th className="px-4 py-3">Komentar</th>
                <th className="px-4 py-3 hidden lg:table-cell">Tanggal</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-56" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? `Tidak ada komentar dengan kata kunci "${search}"` : "Belum ada komentar."}
                  </td>
                </tr>
              ) : (
                filtered.map((comment) => (
                  <tr key={comment.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/berita/${comment.articleId}`}
                        className="font-medium text-foreground hover:text-primary line-clamp-2 max-w-[220px]"
                      >
                        {comment.articleTitle || "Artikel tidak ditemukan"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground font-medium">{comment.email}</div>
                      <div className="text-muted-foreground text-xs">{comment.ipAddress || "IP tidak tercatat"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground line-clamp-2 max-w-sm">{comment.content}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs hidden lg:table-cell">
                      {format(new Date(comment.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDetailComment(comment)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setDeleteId(comment.id)}
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
            <AlertDialogTitle>Hapus Komentar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Komentar akan dihapus secara permanen.
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

      <Dialog open={!!detailComment} onOpenChange={(o) => !o && setDetailComment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Komentar</DialogTitle>
            <DialogDescription>Informasi lengkap pengirim untuk keperluan investigasi.</DialogDescription>
          </DialogHeader>
          {detailComment && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground">Artikel</div>
                <div className="font-medium text-foreground">
                  {detailComment.articleTitle || "Artikel tidak ditemukan"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Email Pengirim</div>
                <div className="font-medium text-foreground">{detailComment.email}</div>
              </div>
              <div>
                <div className="text-muted-foreground">IP Address</div>
                <div className="font-medium text-foreground">{detailComment.ipAddress || "Tidak tercatat"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">User Agent</div>
                <div className="font-medium text-foreground break-all bg-muted p-2 rounded-md text-xs">
                  {detailComment.userAgent || "Tidak tercatat"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Waktu</div>
                <div className="font-medium text-foreground">
                  {format(new Date(detailComment.createdAt), "dd MMMM yyyy HH:mm", { locale: id })}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Isi Komentar</div>
                <div className="bg-muted p-3 rounded-md text-foreground whitespace-pre-wrap">{detailComment.content}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
