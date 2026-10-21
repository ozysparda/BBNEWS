import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useListAdminDonationTransactions,
  useUpdateDonationTransaction,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRupiah } from "@/lib/format-money";
import { toast } from "sonner";
import { ArrowLeft, Check, ExternalLink, Loader2, X } from "lucide-react";

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Menunggu", className: "bg-amber-100 text-amber-800" },
  verified: { label: "Terverifikasi", className: "bg-emerald-100 text-emerald-800" },
  rejected: { label: "Ditolak", className: "bg-red-100 text-red-800" },
};

type DialogState =
  | { mode: "verify"; id: number; reference: string }
  | { mode: "reject"; id: number; reference: string }
  | null;

export default function AdminDonationTransactionList() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useListAdminDonationTransactions({
    page,
    limit: 20,
    status: status === "all" ? undefined : status,
    search: search || undefined,
  });
  const updateTransaction = useUpdateDonationTransaction();

  const transactions = data?.transactions ?? [];

  async function handleConfirm() {
    if (!dialog) return;
    setIsSaving(true);
    try {
      await updateTransaction.mutateAsync({
        id: dialog.id,
        data: {
          status: dialog.mode === "verify" ? "verified" : "rejected",
          adminNote: note.trim() || null,
        },
      });
      toast.success(dialog.mode === "verify" ? "Donasi diverifikasi" : "Donasi ditolak");
      setDialog(null);
      setNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui transaksi");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/donasi")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Transaksi Donasi</h1>
              <p className="text-sm text-muted-foreground">
                Verifikasi atau tolak donasi yang masuk. Yang diverifikasi otomatis ditandai AUTO.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari referensi, nama, email, tx hash..."
                className="max-w-sm"
              />
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="pending">Menunggu</SelectItem>
                  <SelectItem value="verified">Terverifikasi</SelectItem>
                  <SelectItem value="rejected">Ditolak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Belum ada transaksi donasi.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Referensi</th>
                      <th className="px-4 py-3">Donatur</th>
                      <th className="px-4 py-3">Nominal</th>
                      <th className="px-4 py-3">Metode</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((item) => {
                      const meta = STATUS_META[item.status] ?? STATUS_META.pending;
                      return (
                        <tr key={item.id} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-mono text-xs font-semibold">{item.referenceNumber}</p>
                            {item.autoVerified && (
                              <Badge className="mt-1 bg-sky-100 text-sky-800">AUTO</Badge>
                            )}
                            {item.txHash && (
                              <a
                                href={`https://www.google.com/search?q=${item.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary"
                              >
                                {item.txHash.slice(0, 14)}... <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium">{item.donorName}</p>
                            {item.donorEmail && (
                              <p className="text-xs text-muted-foreground">{item.donorEmail}</p>
                            )}
                            {item.message && (
                              <p className="mt-1 line-clamp-2 max-w-xs text-xs italic text-muted-foreground">
                                "{item.message}"
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums">
                            {item.amount > 0 ? formatRupiah(item.amount) : item.cryptoAmount || "-"}
                          </td>
                          <td className="px-4 py-3 uppercase text-xs text-muted-foreground">{item.method}</td>
                          <td className="px-4 py-3">
                            <Badge className={meta.className}>{meta.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleString("id-ID", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              {item.proofUrl && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={item.proofUrl} target="_blank" rel="noopener noreferrer">
                                    Bukti
                                  </a>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-700"
                                onClick={() => {
                                  setNote(item.adminNote ?? "");
                                  setDialog({ mode: "verify", id: item.id, reference: item.referenceNumber });
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => {
                                  setNote(item.adminNote ?? "");
                                  setDialog({ mode: "reject", id: item.id, reference: item.referenceNumber });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Halaman {data.page} dari {data.totalPages} ({data.total} transaksi)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Donatur bisa memantau statusnya sendiri di{" "}
          <Link href="/donasi/lacak" className="underline">
            halaman cek status donasi
          </Link>
          .
        </p>

        <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {dialog?.mode === "verify" ? "Verifikasi Donasi" : "Tolak Donasi"}
              </DialogTitle>
              <DialogDescription>
                Referensi {dialog?.reference}.{" "}
                {dialog?.mode === "verify"
                  ? "Donasi yang diverifikasi akan masuk ke total dana terkumpul."
                  : "Transaksi akan ditandai ditolak dan tidak masuk total dana."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label htmlFor="adminNote" className="text-sm font-medium">
                Catatan admin (opsional)
              </label>
              <Textarea
                id="adminNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Contoh: bukti transfer sudah sesuai."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog(null)}>
                Batal
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSaving}
                variant={dialog?.mode === "verify" ? "default" : "destructive"}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dialog?.mode === "verify" ? "Verifikasi" : "Tolak"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
