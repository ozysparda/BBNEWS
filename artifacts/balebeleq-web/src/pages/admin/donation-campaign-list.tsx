import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useDeleteDonationCampaign,
  useGetDonationStats,
  useListAdminDonationCampaigns,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Coins, HandHeart, Plus, Settings, ShieldCheck, Trash2, Wallet } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  active: { label: "Aktif", className: "bg-emerald-100 text-emerald-800" },
  closed: { label: "Ditutup", className: "bg-amber-100 text-amber-800" },
  archived: { label: "Arsip", className: "bg-slate-100 text-slate-700" },
};

export default function AdminDonationCampaignList() {
  const [, setLocation] = useLocation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading } = useListAdminDonationCampaigns({
    page,
    limit: 20,
    search: search || undefined,
    status: status === "all" ? undefined : status,
  });
  const { data: stats } = useGetDonationStats();
  const deleteCampaign = useDeleteDonationCampaign();

  const campaigns = data?.campaigns ?? [];

  async function handleDelete(id: number, title: string) {
    if (!window.confirm(`Hapus campaign "${title}"? Transaksi donasi ikut terhapus.`)) return;
    setDeletingId(id);
    try {
      await deleteCampaign.mutateAsync({ id });
      toast.success("Campaign dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus campaign");
    } finally {
      setDeletingId(null);
    }
  }

  const statCards = [
    { label: "Campaign Aktif", value: stats?.activeCampaigns ?? 0, icon: HandHeart },
    { label: "Total Campaign", value: stats?.totalCampaigns ?? 0, icon: Coins },
    { label: "Dana Terkumpul", value: stats?.collectedAmount ?? 0, icon: Wallet, money: true },
    { label: "Menunggu Verifikasi", value: stats?.pendingCount ?? 0, icon: Coins },
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Berugak Donasi</h1>
            <p className="text-sm text-muted-foreground">
              Kelola campaign donasi, transaksi, dan pengaturan donasi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setLocation("/admin/donasi/transaksi")}>
              <Coins className="mr-2 h-4 w-4" /> Transaksi
            </Button>
            <Button variant="outline" onClick={() => setLocation("/admin/donasi/verifikasi")}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Verifikasi Otomatis
            </Button>
            <Button variant="outline" onClick={() => setLocation("/admin/donasi/pengaturan")}>
              <Settings className="mr-2 h-4 w-4" /> Pengaturan
            </Button>
            <Button onClick={() => setLocation("/admin/donasi/baru")}>
              <Plus className="mr-2 h-4 w-4" /> Campaign Baru
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.label}</p>
                  <p className="truncate text-lg font-bold">
                    {card.money
                      ? new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(card.value)
                      : card.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
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
                placeholder="Cari judul campaign..."
                className="max-w-xs"
              />
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="closed">Ditutup</SelectItem>
                  <SelectItem value="archived">Arsip</SelectItem>
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
            ) : campaigns.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                Belum ada campaign. Klik "Campaign Baru" untuk membuat campaign pertama.
              </p>
            ) : (
              <div className="overflow-x-auto"><Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Terkumpul</TableHead>
                    <TableHead>Progres</TableHead>
                    <TableHead className="text-right">Donatur</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const meta = STATUS_LABEL[campaign.status] ?? STATUS_LABEL.draft;
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <Link
                            href={`/admin/donasi/${campaign.id}/edit`}
                            className="font-medium hover:text-primary"
                          >
                            {campaign.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {campaign.slug}
                            {campaign.deadline
                              ? ` - deadline ${new Date(campaign.deadline).toLocaleDateString("id-ID")}`
                              : ""}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge className={meta.className}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(campaign.targetAmount ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(campaign.collectedAmount ?? 0)}
                        </TableCell>
                        <TableCell>
                          <div className="w-32">
                            <Progress value={campaign.progress ?? 0} className="h-1.5" />
                            <span className="text-xs text-muted-foreground">{campaign.progress ?? 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{campaign.donorCount ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/admin/donasi/${campaign.id}/edit`)}
                            >
                              Ubah
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              disabled={deletingId === campaign.id}
                              onClick={() => handleDelete(campaign.id, campaign.title)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table></div>
            )}
          </CardContent>
        </Card>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Halaman {data.page} dari {data.totalPages} ({data.total} campaign)
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
      </div>
    </AdminLayout>
  );
}
