import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { put } from "@vercel/blob/client";
import {
  getGetAdminDonationCampaignQueryKey,
  useCreateDonationCampaign,
  useGetAdminDonationCampaign,
  useUpdateDonationCampaign,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiUrl } from "@/lib/api-url";
import { formatRupiah, parseNominal } from "@/lib/format-money";
import { toast } from "sonner";
import { ArrowLeft, ImageIcon, Loader2, Save } from "lucide-react";

async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new Error("Sesi admin habis, silakan login ulang.");

  const res = await fetch(apiUrl("/api/storage/upload-token"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: file.name }),
  });

  if (!res.ok) throw new Error("Gagal mendapatkan token upload");
  const { token: clientToken, pathname } = await res.json();
  const blob = await put(pathname, file, { access: "public", token: clientToken });
  return blob.url;
}

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export default function AdminDonationCampaignForm() {
  const params = useParams<{ id?: string }>();
  const isEdit = Boolean(params.id);
  const campaignId = isEdit ? parseInt(params.id as string, 10) : undefined;
  const [, setLocation] = useLocation();

  const coverInputRef = useRef<HTMLInputElement>(null);
  const qrisInputRef = useRef<HTMLInputElement>(null);

  const { data: campaign, isLoading } = useGetAdminDonationCampaign(campaignId ?? 0, {
    query: {
      queryKey: getGetAdminDonationCampaignQueryKey(campaignId ?? 0),
      enabled: isEdit && !Number.isNaN(campaignId as number),
    },
  });
  const createCampaign = useCreateDonationCampaign();
  const updateCampaign = useUpdateDonationCampaign();

  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [minAmount, setMinAmount] = useState("1000");
  const [qrisImageUrl, setQrisImageUrl] = useState("");
  const [qrisPayload, setQrisPayload] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [cryptoNetwork, setCryptoNetwork] = useState("");
  const [cryptoSymbol, setCryptoSymbol] = useState("");
  const [cryptoAddress, setCryptoAddress] = useState("");
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [status, setStatus] = useState("draft");
  const [startAt, setStartAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [uploading, setUploading] = useState<"cover" | "qris" | null>(null);

  useEffect(() => {
    if (!campaign) return;
    setTitle(campaign.title ?? "");
    setExcerpt(campaign.excerpt ?? "");
    setContent(campaign.content ?? "");
    setCoverImageUrl(campaign.coverImageUrl ?? "");
    setTargetAmount(campaign.targetAmount ? String(campaign.targetAmount) : "");
    setMinAmount(String(campaign.minAmount ?? 1000));
    setQrisImageUrl(campaign.qrisImageUrl ?? "");
    setQrisPayload(campaign.qrisPayload ?? "");
    setBankName(campaign.bankName ?? "");
    setBankAccountNumber(campaign.bankAccountNumber ?? "");
    setBankAccountHolder(campaign.bankAccountHolder ?? "");
    setCryptoNetwork(campaign.cryptoNetwork ?? "");
    setCryptoSymbol(campaign.cryptoSymbol ?? "");
    setCryptoAddress(campaign.cryptoAddress ?? "");
    setAutoConfirm(Boolean(campaign.autoConfirm));
    setStatus(campaign.status ?? "draft");
    setStartAt(toDateTimeLocal(campaign.startAt));
    setDeadline(toDateTimeLocal(campaign.deadline));
  }, [campaign]);

  async function handleUpload(kind: "cover" | "qris", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5 MB");
      return;
    }
    setUploading(kind);
    try {
      const url = await uploadImage(file);
      if (kind === "cover") setCoverImageUrl(url);
      else setQrisImageUrl(url);
      toast.success("Gambar berhasil diunggah");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload gagal");
    } finally {
      setUploading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (title.trim().length < 4) {
      toast.error("Judul campaign minimal 4 karakter");
      return;
    }

    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content,
      coverImageUrl: coverImageUrl.trim() || null,
      targetAmount: parseNominal(targetAmount),
      minAmount: parseNominal(minAmount) || 1000,
      qrisImageUrl: qrisImageUrl.trim() || null,
      qrisPayload: qrisPayload.trim() || null,
      bankName: bankName.trim() || null,
      bankAccountNumber: bankAccountNumber.trim() || null,
      bankAccountHolder: bankAccountHolder.trim() || null,
      cryptoNetwork: cryptoNetwork.trim() || null,
      cryptoSymbol: cryptoSymbol.trim() || null,
      cryptoAddress: cryptoAddress.trim() || null,
      autoConfirm,
      status: status as "draft" | "active" | "closed" | "archived",
      startAt: startAt ? new Date(startAt).toISOString() : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    };

    try {
      if (isEdit) {
        await updateCampaign.mutateAsync({ id: campaignId as number, data: payload });
        toast.success("Campaign diperbarui");
      } else {
        await createCampaign.mutateAsync({ data: payload });
        toast.success("Campaign dibuat");
      }
      setLocation("/admin/donasi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan campaign");
    }
  }

  const isPending = createCampaign.isPending || updateCampaign.isPending;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/donasi")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEdit ? "Ubah Campaign Donasi" : "Campaign Donasi Baru"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Isi judul, tulisan campaign, target, dan metode pembayaran.
            </p>
          </div>
        </div>

        {isEdit && isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="font-semibold">Informasi Campaign</h2>

                <div className="space-y-1.5">
                  <Label htmlFor="title">Judul Campaign *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: BantuRnRD ke Living Room disaster"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="excerpt">Ringkasan</Label>
                  <Textarea
                    id="excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Ringkasan singkat yang tampil di kartu campaign."
                    rows={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tulisan Campaign</Label>
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Ceritakan campaign ini: latar belakang, penggunaan dana, dan target yang dituju..."
                    minHeight="320px"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="target">Target Donasi (Rp)</Label>
                    <Input
                      id="target"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="5000000"
                      inputMode="numeric"
                    />
                    <p className="text-xs text-muted-foreground">
                      {targetAmount ? `Target: ${formatRupiah(parseNominal(targetAmount))}` : "Isi 0 bila tanpa target."}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="minAmount">Minimal Donasi (Rp)</Label>
                    <Input
                      id="minAmount"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      placeholder="1000"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Gambar Cover</Label>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload("cover", e)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading === "cover"}
                    onClick={() => coverInputRef.current?.click()}
                  >
                    {uploading === "cover" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengunggah...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" /> Pilih gambar
                      </>
                    )}
                  </Button>
                  {coverImageUrl && (
                    <img
                      src={coverImageUrl}
                      alt="Cover campaign"
                      className="mt-2 max-h-48 rounded-lg border border-border object-cover"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="font-semibold">Metode Pembayaran</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="qrisPayload">Payload QRIS (opsional)</Label>
                    <Textarea
                      id="qrisPayload"
                      value={qrisPayload}
                      onChange={(e) => setQrisPayload(e.target.value)}
                      placeholder="String QRIS/EMV. Kalau diisi, QR digenerate otomatis di halaman publik."
                      rows={3}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gambar QRIS</Label>
                    <input
                      ref={qrisInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUpload("qris", e)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading === "qris"}
                      onClick={() => qrisInputRef.current?.click()}
                    >
                      {uploading === "qris" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengunggah...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mr-2 h-4 w-4" /> Unggah QRIS
                        </>
                      )}
                    </Button>
                    {qrisImageUrl && (
                      <img
                        src={qrisImageUrl}
                        alt="QRIS"
                        className="mt-2 h-40 w-40 rounded-lg border border-border bg-white object-contain p-2"
                      />
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="bankName">Nama Bank</Label>
                    <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank NTB" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankAccountNumber">No. Rekening</Label>
                    <Input
                      id="bankAccountNumber"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="0012345678"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankAccountHolder">Atas Nama</Label>
                    <Input
                      id="bankAccountHolder"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      placeholder="Nama lengkap pemilik rekening"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cryptoNetwork">Jaringan Kripto</Label>
                    <Input
                      id="cryptoNetwork"
                      value={cryptoNetwork}
                      onChange={(e) => setCryptoNetwork(e.target.value)}
                      placeholder="TRC-20 (TRON)"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cryptoSymbol">Simbol</Label>
                    <Input
                      id="cryptoSymbol"
                      value={cryptoSymbol}
                      onChange={(e) => setCryptoSymbol(e.target.value)}
                      placeholder="USDT"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cryptoAddress">Alamat Wallet</Label>
                    <Input
                      id="cryptoAddress"
                      value={cryptoAddress}
                      onChange={(e) => setCryptoAddress(e.target.value)}
                      placeholder="T..."
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Auto konfirmasi kripto</p>
                    <p className="text-xs text-muted-foreground">
                      Server mengecek tx hash ke explorer publik. Bila gagal dicek, transaksi menunggu konfirmasi manual.
                    </p>
                  </div>
                  <Switch checked={autoConfirm} onCheckedChange={setAutoConfirm} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="font-semibold">Publikasi</h2>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Aktif (tampil di publik)</SelectItem>
                        <SelectItem value="closed">Ditutup</SelectItem>
                        <SelectItem value="archived">Arsip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="startAt">Mulai</Label>
                    <Input id="startAt" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLocation("/admin/donasi")}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Simpan Campaign
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
