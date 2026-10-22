import { useRef, useState } from "react";
import { useParams, Link } from "wouter";
import { put } from "@vercel/blob/client";
import { QRCodeSVG } from "qrcode.react";
import { useCreateDonationTransaction, useGetDonationCampaign } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { formatRupiah, parseNominal } from "@/lib/format-money";
import {
  ArrowLeft,
  Bitcoin,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  HandHeart,
  ImageIcon,
  Loader2,
  QrCode,
  Users,
} from "lucide-react";

type Method = "qris" | "bank" | "crypto";

const QUICK_AMOUNTS = [10000, 25000, 50000, 100000, 250000, 500000];

async function uploadProof(file: File): Promise<string> {
  const res = await fetch(apiUrl("/api/donations/upload-token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name }),
  });

  if (!res.ok) throw new Error("Gagal mendapatkan token upload bukti");

  const { token: clientToken, pathname } = await res.json();
  const blob = await put(pathname, file, { access: "public", token: clientToken });
  return blob.url;
}

export default function DonationDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: campaign, isLoading } = useGetDonationCampaign(slug);
  const createDonation = useCreateDonationTransaction();

  const [method, setMethod] = useState<Method>("qris");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState<{ referenceNumber: string; status: string; message: string; autoVerified: boolean } | null>(null);

  const collected = campaign?.collectedAmount ?? 0;
  const target = campaign?.targetAmount ?? 0;
  const progress = campaign?.progress ?? (target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0);
  const minAmount = campaign?.minAmount ?? 1000;

  const hasQris = Boolean(campaign?.qrisImageUrl || campaign?.qrisPayload);
  const hasBank = Boolean(campaign?.bankAccountNumber);
  const hasCrypto = Boolean(campaign?.cryptoAddress);

  const availableMethods: Method[] = [];
  if (hasQris) availableMethods.push("qris");
  if (hasBank) availableMethods.push("bank");
  if (hasCrypto) availableMethods.push("crypto");
  const activeMethod: Method = availableMethods.includes(method) ? method : availableMethods[0] ?? "qris";

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Ukuran file maksimal 5 MB" });
      return;
    }

    setUploading(true);
    try {
      const url = await uploadProof(file);
      setProofUrl(url);
      toast({ title: "Bukti transfer berhasil diunggah" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload gagal",
        description: error instanceof Error ? error.message : "Coba lagi beberapa saat lagi.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (donorName.trim().length < 2) {
      toast({ variant: "destructive", title: "Nama donatur wajib diisi" });
      return;
    }

    if (activeMethod !== "crypto") {
      const value = parseNominal(amount);
      if (value < minAmount) {
        toast({ variant: "destructive", title: `Minimal donasi ${formatRupiah(minAmount)}` });
        return;
      }
    } else if (!txHash.trim()) {
      toast({ variant: "destructive", title: "tx hash wajib diisi untuk donasi kripto" });
      return;
    }

    try {
      const result = await createDonation.mutateAsync({
        data: {
          campaignId: campaign!.id,
          campaignSlug: campaign!.slug,
          donorName: donorName.trim(),
          donorEmail: donorEmail.trim() || undefined,
          donorPhone: donorPhone.trim() || undefined,
          amount: activeMethod === "crypto" ? 0 : parseNominal(amount),
          cryptoAmount: activeMethod === "crypto" ? cryptoAmount.trim() || undefined : undefined,
          txHash: activeMethod === "crypto" ? txHash.trim() : undefined,
          method: activeMethod,
          message: message.trim() || undefined,
          proofUrl: proofUrl ?? undefined,
          isAnonymous,
        },
      });

      setDone({
        referenceNumber: result.referenceNumber,
        status: result.status,
        message: result.message,
        autoVerified: result.autoVerified ?? false,
      });
      toast({
        title: result.autoVerified ? "Donasi terverifikasi otomatis" : "Donasi terkirim",
        description: result.message,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal mengirim donasi",
        description: error instanceof Error ? error.message : "Coba lagi beberapa saat lagi.",
      });
    }
  }

  function copyText(value: string, label: string) {
    navigator.clipboard?.writeText(value).then(
      () => toast({ title: `${label} disalin` }),
      () => toast({ variant: "destructive", title: "Gagal menyalin" }),
    );
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-10">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="mt-6 h-8 w-1/2" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      </PublicLayout>
    );
  }

  if (!campaign) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 text-center">
          <HandHeart className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 font-semibold">Campaign tidak ditemukan</p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/donasi">Kembali ke daftar campaign</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <SEO
        title={campaign.title}
        description={campaign.excerpt || `Donasi untuk ${campaign.title} melalui Berugak Donasi.`}
        image={campaign.coverImageUrl ?? undefined}
        url={`/donasi/${campaign.slug}`}
        keywords="donasi, berugaknews, campaign donasi"
      />

      <div className="container mx-auto px-4 py-8 md:py-12">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link href="/donasi">
            <ArrowLeft className="mr-2 h-4 w-4" /> Semua campaign
          </Link>
        </Button>

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Kolom kiri: detail campaign */}
          <div>
            {campaign.coverImageUrl && (
              <img
                src={campaign.coverImageUrl}
                alt={campaign.title}
                className="mb-6 h-64 w-full rounded-xl object-cover md:h-80"
              />
            )}

            <h1 className="font-serif text-2xl font-black leading-tight md:text-3xl">{campaign.title}</h1>

            {campaign.excerpt && (
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">{campaign.excerpt}</p>
            )}

            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-primary">{formatRupiah(collected)}</span>
                <span className="text-sm text-muted-foreground">target {formatRupiah(target)}</span>
              </div>
              <Progress value={progress} className="mt-3 h-2.5" />
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>{progress}% terkumpul</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {campaign.donorCount ?? 0} donatur
                </span>
                {campaign.deadline && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Deadline {new Date(campaign.deadline).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>

            {campaign.content && (
              <div
                className="prose prose-neutral mt-8 max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: campaign.content }}
              />
            )}

            {/* Metode pembayaran */}
            <div className="mt-10">
              <h2 className="font-serif text-xl font-bold">Cara Berdonasi</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pilih salah satu metode pembayaran di bawah, lalu isi form donasi.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {hasQris && (
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center gap-2 font-semibold">
                        <QrCode className="h-4 w-4 text-primary" /> QRIS
                      </div>
                      {campaign.qrisImageUrl ? (
                        <img
                          src={campaign.qrisImageUrl}
                          alt="QRIS Berugak Donasi"
                          className="mx-auto h-48 w-48 rounded-lg border border-border bg-white p-2 object-contain"
                        />
                      ) : campaign.qrisPayload ? (
                        <div className="flex justify-center rounded-lg border border-border bg-white p-3">
                          <QRCodeSVG value={campaign.qrisPayload} size={176} level="M" />
                        </div>
                      ) : null}
                      <p className="text-center text-xs text-muted-foreground">
                        Scan dengan aplikasi m-banking/ e-wallet kamu.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {hasBank && (
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center gap-2 font-semibold">
                        <Building2 className="h-4 w-4 text-primary" /> Transfer Bank
                      </div>
                      <dl className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-muted-foreground">Bank</dt>
                          <dd className="font-medium">{campaign.bankName || "-"}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-muted-foreground">No. Rekening</dt>
                          <dd className="flex items-center gap-2 font-mono font-medium">
                            {campaign.bankAccountNumber}
                            <button
                              type="button"
                              onClick={() => copyText(campaign.bankAccountNumber || "", "Nomor rekening")}
                              className="text-muted-foreground hover:text-primary"
                              aria-label="Salin nomor rekening"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-muted-foreground">Atas Nama</dt>
                          <dd className="font-medium">{campaign.bankAccountHolder || "-"}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                )}

                {hasCrypto && (
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center gap-2 font-semibold">
                        <Bitcoin className="h-4 w-4 text-primary" /> Kripto
                      </div>
                      <dl className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-muted-foreground">Jaringan</dt>
                          <dd className="font-medium">{campaign.cryptoNetwork || "-"}</dd>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <dt className="text-muted-foreground">Simbol</dt>
                          <dd className="font-medium">{campaign.cryptoSymbol || "-"}</dd>
                        </div>
                        <div className="space-y-1">
                          <dt className="text-muted-foreground">Alamat Wallet</dt>
                          <dd className="flex items-start gap-2">
                            <code className="break-all font-mono text-xs">{campaign.cryptoAddress}</code>
                            <button
                              type="button"
                              onClick={() => copyText(campaign.cryptoAddress || "", "Alamat wallet")}
                              className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary"
                              aria-label="Salin alamat wallet"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </dd>
                        </div>
                      </dl>
                      {campaign.autoConfirm && (
                        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                          Donasi kripto pada campaign ini diverifikasi otomatis dari tx hash.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Kolom kanan: form donasi */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              <CardContent className="p-5">
                {done ? (
                  <div className="space-y-4 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                    <div>
                      <p className="font-semibold">
                        {done.autoVerified ? "Donasi terverifikasi otomatis" : "Donasi berhasil dikirim"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{done.message}</p>
                    </div>
                    <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Nomor Referensi</p>
                      <p className="mt-1 font-mono text-base font-bold">{done.referenceNumber}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button asChild variant="outline">
                        <Link href={`/donasi/lacak?ref=${done.referenceNumber}`}>Cek Status Donasi</Link>
                      </Button>
                      <Button asChild>
                        <Link href="/donasi">Kembali ke daftar campaign</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <h2 className="font-serif text-lg font-bold">Form Donasi</h2>
                      <p className="text-xs text-muted-foreground">
                        Minimal donasi {formatRupiah(minAmount)}
                      </p>
                    </div>

                    {availableMethods.length > 0 && (
                      <div className="space-y-2">
                        <Label>Metode Pembayaran</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {availableMethods.map((item) => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setMethod(item)}
                              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                                activeMethod === item
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border hover:bg-muted"
                              }`}
                            >
                              {item === "qris" ? "QRIS" : item === "bank" ? "Bank" : "Kripto"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="donorName">Nama Donatur *</Label>
                      <Input
                        id="donorName"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        placeholder="Nama lengkap atau nama samaran"
                        required
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="donorEmail">Email</Label>
                        <Input
                          id="donorEmail"
                          type="email"
                          value={donorEmail}
                          onChange={(e) => setDonorEmail(e.target.value)}
                          placeholder="email@contoh.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="donorPhone">WhatsApp</Label>
                        <Input
                          id="donorPhone"
                          value={donorPhone}
                          onChange={(e) => setDonorPhone(e.target.value)}
                          placeholder="08xxxxxxxxxx"
                        />
                      </div>
                    </div>

                    {activeMethod === "crypto" ? (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="cryptoAmount">
                            Nominal {campaign.cryptoSymbol ? `(${campaign.cryptoSymbol})` : ""}
                          </Label>
                          <Input
                            id="cryptoAmount"
                            value={cryptoAmount}
                            onChange={(e) => setCryptoAmount(e.target.value)}
                            placeholder="contoh: 25"
                            inputMode="decimal"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="txHash">Tx Hash *</Label>
                          <Input
                            id="txHash"
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            placeholder="0x... atau hash transaksi"
                            className="font-mono text-xs"
                            required
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1.5">
                        <Label htmlFor="amount">Nominal (Rp) *</Label>
                        <Input
                          id="amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="50000"
                          inputMode="numeric"
                          required
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_AMOUNTS.map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setAmount(String(value))}
                              className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                            >
                              {formatRupiah(value)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="proof">Bukti Transfer</Label>
                      <input
                        ref={fileInputRef}
                        id="proof"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengunggah...
                          </>
                        ) : proofUrl ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Bukti terunggah
                          </>
                        ) : (
                          <>
                            <ImageIcon className="mr-2 h-4 w-4" /> Unggah bukti (maks 5 MB)
                          </>
                        )}
                      </Button>
                      {proofUrl && (
                        <img src={proofUrl} alt="Bukti transfer" className="mt-2 max-h-40 rounded-lg border border-border object-cover" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="message">Doa / Pesan</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Semoga bermanfaat untuk penerima manfaat."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="anonymous"
                        checked={isAnonymous}
                        onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                      />
                      <Label htmlFor="anonymous" className="text-sm font-normal">
                        Sembunyikan nama saya di daftar donatur
                      </Label>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={createDonation.isPending}>
                      {createDonation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim...
                        </>
                      ) : (
                        "Kirim Donasi"
                      )}
                    </Button>

                    <p className="text-center text-xs leading-relaxed text-muted-foreground">
                      Donasi diverifikasi otomatis (bila memungkinkan) atau dikonfirmasi manual oleh admin.
                      Simpan nomor referensi untuk mengecek status.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Donatur terbaru */}
        {campaign.recentDonations && campaign.recentDonations.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-xl font-bold">Donatur Terbaru</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {campaign.recentDonations.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-card px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{item.donorName}</p>
                    <p className="shrink-0 font-bold text-primary">{formatRupiah(item.amount)}</p>
                  </div>
                  {item.message && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">"{item.message}"</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}
