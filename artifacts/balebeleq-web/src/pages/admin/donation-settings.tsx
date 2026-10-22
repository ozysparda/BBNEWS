import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { put } from "@vercel/blob/client";
import {
  useGetAdminDonationSettings,
  useUpdateDonationSettings,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
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
import { toast } from "sonner";
import { ArrowLeft, ImageIcon, Loader2, Save, Heart } from "lucide-react";

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

export default function AdminDonationSettingsPage() {
  const [, setLocation] = useLocation();
  const qrisInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useGetAdminDonationSettings();
  const updateSettings = useUpdateDonationSettings();

  const [heroTitle, setHeroTitle] = useState("Berugak Donasi");
  const [heroDescription, setHeroDescription] = useState("");
  const [qrisImageUrl, setQrisImageUrl] = useState("");
  const [qrisPayload, setQrisPayload] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [isOpen, setIsOpen] = useState(true);

  // Popup settings
  const [popupEnabled, setPopupEnabled] = useState(false);
  const [popupCampaignId, setPopupCampaignId] = useState("");
  const [popupPlacement, setPopupPlacement] = useState("floating");
  const [popupDelay, setPopupDelay] = useState("5");
  const [popupDismissable, setPopupDismissable] = useState(true);

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setHeroTitle(settings.heroTitle ?? "Berugak Donasi");
    setHeroDescription(settings.heroDescription ?? "");
    setQrisImageUrl(settings.qrisImageUrl ?? "");
    setQrisPayload(settings.qrisPayload ?? "");
    setBankName(settings.bankName ?? "");
    setBankAccountNumber(settings.bankAccountNumber ?? "");
    setBankAccountHolder(settings.bankAccountHolder ?? "");
    setIsOpen(settings.isOpen ?? true);
    setPopupEnabled(settings.popupEnabled ?? false);
    setPopupCampaignId(settings.popupCampaignId ? String(settings.popupCampaignId) : "");
    setPopupPlacement(settings.popupPlacement ?? "floating");
    setPopupDelay(String(settings.popupDelay ?? 5));
    setPopupDismissable(settings.popupDismissable ?? true);
  }, [settings]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5 MB");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setQrisImageUrl(url);
      toast.success("QRIS berhasil diunggah");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({
        data: {
          heroTitle: heroTitle.trim() || "Berugak Donasi",
          heroDescription: heroDescription.trim(),
          qrisImageUrl: qrisImageUrl.trim() || null,
          qrisPayload: qrisPayload.trim() || null,
          bankName: bankName.trim() || null,
          bankAccountNumber: bankAccountNumber.trim() || null,
          bankAccountHolder: bankAccountHolder.trim() || null,
          isOpen,
          popupEnabled,
          popupCampaignId: popupCampaignId ? Number(popupCampaignId) : null,
          popupPlacement: popupPlacement as any,
          popupDelay: Number(popupDelay) || 5,
          popupDismissable,
        },
      });
      toast.success("Pengaturan donasi disimpan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan pengaturan");
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/donasi")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Pengaturan Donasi</h1>
            <p className="text-sm text-muted-foreground">
              Teks utama halaman donasi, QRIS/rekening cadangan, dan pengaturan popup.
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="font-semibold">Halaman Donasi</h2>

                <div className="space-y-1.5">
                  <Label htmlFor="heroTitle">Judul Hero</Label>
                  <Input
                    id="heroTitle"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="Berugak Donasi"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="heroDescription">Deskripsi</Label>
                  <Textarea
                    id="heroDescription"
                    value={heroDescription}
                    onChange={(e) => setHeroDescription(e.target.value)}
                    rows={3}
                    placeholder="Penjelasan singkat kenapa donasi dibutuhkan."
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Donasi dibuka</p>
                    <p className="text-xs text-muted-foreground">
                      Nonaktifkan hanya bila seluruh campaign sedang ditutup.
                    </p>
                  </div>
                  <Switch checked={isOpen} onCheckedChange={setIsOpen} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Popup Donasi (Iklan)</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tampilkan campaign donasi sebagai popup di website. Pilih penempatan dan campaign yang ingin ditampilkan.
                </p>

                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Aktifkan popup</p>
                    <p className="text-xs text-muted-foreground">
                      Popup hanya muncul jika ada campaign aktif yang dipilih.
                    </p>
                  </div>
                  <Switch checked={popupEnabled} onCheckedChange={setPopupEnabled} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="popupCampaignId">Campaign yang ditampilkan</Label>
                    <Input
                      id="popupCampaignId"
                      type="number"
                      value={popupCampaignId}
                      onChange={(e) => setPopupCampaignId(e.target.value)}
                      placeholder="ID campaign (kosongkan = tidak ada)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Masukkan ID campaign aktif. Lihat ID di daftar campaign.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Penempatan popup</Label>
                    <Select value={popupPlacement} onValueChange={setPopupPlacement}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="floating">Floating (pojok kanan bawah)</SelectItem>
                        <SelectItem value="home-banner">Banner di halaman utama</SelectItem>
                        <SelectItem value="article-top">Di atas artikel</SelectItem>
                        <SelectItem value="article-middle">Di tengah artikel</SelectItem>
                        <SelectItem value="article-bottom">Di bawah artikel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="popupDelay">Delay muncul (detik)</Label>
                    <Input
                      id="popupDelay"
                      type="number"
                      min="0"
                      max="60"
                      value={popupDelay}
                      onChange={(e) => setPopupDelay(e.target.value)}
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground">
                      Berlaku untuk floating popup. 0 = langsung muncul.
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">Bisa ditutup</p>
                      <p className="text-xs text-muted-foreground">
                        Pengunjung bisa menutup popup.
                      </p>
                    </div>
                    <Switch checked={popupDismissable} onCheckedChange={setPopupDismissable} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-5">
                <h2 className="font-semibold">QRIS & Rekening Cadangan</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="qrisPayload">Payload QRIS</Label>
                    <Textarea
                      id="qrisPayload"
                      value={qrisPayload}
                      onChange={(e) => setQrisPayload(e.target.value)}
                      rows={3}
                      className="font-mono text-xs"
                      placeholder="String QRIS/EMV"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Gambar QRIS</Label>
                    <input
                      ref={qrisInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => qrisInputRef.current?.click()}
                    >
                      {uploading ? (
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
                    <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankAccountNumber">No. Rekening</Label>
                    <Input
                      id="bankAccountNumber"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankAccountHolder">Atas Nama</Label>
                    <Input
                      id="bankAccountHolder"
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Simpan Pengaturan
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