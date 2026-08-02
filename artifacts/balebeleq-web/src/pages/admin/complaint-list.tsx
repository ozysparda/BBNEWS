import { useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  useDeleteAdminComplaint,
  useListAdminComplaints,
  useUpdateComplaintStatus,
  getListAdminComplaintsQueryKey,
} from "@workspace/api-client-react";
import type { Complaint } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Eye, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statuses = [
  { value: "pending", label: "Menunggu" },
  { value: "in-review", label: "Ditinjau" },
  { value: "resolved", label: "Selesai" },
  { value: "rejected", label: "Ditolak" },
] as const;

function statusLabel(status: string) {
  return statuses.find((item) => item.value === status)?.label ?? status;
}

function statusClass(status: string) {
  if (status === "resolved") return "bg-emerald-500 text-white";
  if (status === "rejected") return "bg-red-500 text-white";
  if (status === "in-review") return "bg-blue-500 text-white";
  return "bg-amber-500 text-white";
}

export default function AdminComplaintList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: complaints, isLoading } = useListAdminComplaints();
  const updateStatus = useUpdateComplaintStatus();
  const deleteComplaint = useDeleteAdminComplaint();
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Complaint | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const allComplaints = complaints ?? [];
  const filtered = allComplaints.filter((complaint) => {
    const term = search.toLowerCase();
    return (
      !term ||
      complaint.email.toLowerCase().includes(term) ||
      complaint.content.toLowerCase().includes(term) ||
      (complaint.location ?? "").toLowerCase().includes(term)
    );
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getListAdminComplaintsQueryKey() });
  }

  function changeStatus(id: number, status: string) {
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "Status aduan diperbarui" });
          refresh();
        },
        onError: () => toast({ title: "Gagal memperbarui status", variant: "destructive" }),
      },
    );
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteComplaint.mutate(
      { id: deleteId },
      {
        onSuccess: () => {
          toast({ title: "Aduan berhasil dihapus" });
          setDeleteId(null);
          setDetail(null);
          refresh();
        },
        onError: () => toast({ title: "Gagal menghapus aduan", variant: "destructive" }),
      },
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Aduan Masyarakat</h1>
          <p className="mt-1 text-muted-foreground">
            Tinjau laporan, cek metadata pengirim, dan ubah status penanganan.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm">
          <AlertTriangle className="h-4 w-4" />
          Total <span className="font-bold">{allComplaints.length}</span>
        </div>
      </div>

      <div className="mb-5 flex justify-end">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari email, isi laporan, atau lokasi..."
          className="h-9 w-full sm:w-80"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Pengirim</th>
                <th className="px-4 py-3">Ringkasan laporan</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 lg:table-cell">Tanggal</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [...Array(5)].map((_, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-36" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-64" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="hidden px-4 py-3 lg:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="ml-auto h-8 w-20" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? "Tidak ada aduan yang cocok." : "Belum ada aduan masuk."}
                  </td>
                </tr>
              ) : (
                filtered.map((complaint) => (
                  <tr key={complaint.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-foreground">{complaint.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {complaint.location ? `Lokasi: ${complaint.location}` : "Lokasi tidak dibagikan"}
                      </div>
                    </td>
                    <td className="max-w-[380px] px-4 py-3 align-top">
                      <p className="line-clamp-2 text-foreground">{complaint.content}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        value={complaint.status}
                        onChange={(event) => changeStatus(complaint.id, event.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        aria-label={`Status aduan dari ${complaint.email}`}
                      >
                        {statuses.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                      <Badge className={`mt-2 text-[10px] ${statusClass(complaint.status)}`}>
                        {statusLabel(complaint.status)}
                      </Badge>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 align-top text-xs text-muted-foreground lg:table-cell">
                      {format(new Date(complaint.createdAt), "dd MMM yyyy HH:mm", { locale: id })}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDetail(complaint)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => setDeleteId(complaint.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Aduan</DialogTitle>
            <DialogDescription>Metadata pengirim hanya tersedia untuk admin.</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div><div className="text-muted-foreground">Email</div><div className="font-medium">{detail.email}</div></div>
              <div><div className="text-muted-foreground">Isi laporan</div><div className="whitespace-pre-wrap rounded-md bg-muted p-3">{detail.content}</div></div>
              <div><div className="text-muted-foreground">Lokasi yang dibagikan</div><div className="font-medium">{detail.location || "Tidak dibagikan"}</div></div>
              <div><div className="text-muted-foreground">IP address</div><div className="font-medium">{detail.ipAddress || "Tidak tercatat"}</div></div>
              <div><div className="text-muted-foreground">Perangkat / user-agent</div><div className="break-all rounded-md bg-muted p-2 text-xs">{detail.userAgent || "Tidak tercatat"}</div></div>
              <div><div className="text-muted-foreground">Dikirim pada</div><div className="font-medium">{format(new Date(detail.createdAt), "dd MMMM yyyy HH:mm", { locale: id })}</div></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus aduan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Aduan akan dihapus permanen dari sistem. Pastikan data tidak lagi diperlukan untuk investigasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}