import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTrackDonationTransaction, getTrackDonationTransactionQueryKey } from "@workspace/api-client-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { SEO } from "@/components/seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupiah } from "@/lib/format-money";
import { CheckCircle2, Clock, Search, XCircle } from "lucide-react";

const STATUS_META: Record<string, { label: string; icon: typeof Clock; className: string; description: string }> = {
  pending: {
    label: "Menunggu Verifikasi",
    icon: Clock,
    className: "text-amber-600 bg-amber-50",
    description: "Donasi sudah kami terima dan sedang menunggu konfirmasi admin.",
  },
  verified: {
    label: "Terverifikasi",
    icon: CheckCircle2,
    className: "text-emerald-700 bg-emerald-50",
    description: "Donasi sudah dikonfirmasi. Terima kasih!",
  },
  rejected: {
    label: "Ditolak",
    icon: XCircle,
    className: "text-red-700 bg-red-50",
    description: "Donasi tidak dapat diverifikasi. Hubungi admin bila ada pertanyaan.",
  },
};

export default function DonationTrackingPage() {
  const [search] = useLocation();
  const initialRef = new URLSearchParams(search).get("ref") ?? "";

  const [reference, setReference] = useState(initialRef);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<{ reference: string; email: string } | null>(
    initialRef ? { reference: initialRef, email: "" } : null,
  );

  const trackParams = submitted?.email ? { email: submitted.email } : undefined;

  const { data, isFetching, isError } = useTrackDonationTransaction(
    submitted?.reference ?? "",
    trackParams,
    {
      query: {
        queryKey: getTrackDonationTransactionQueryKey(submitted?.reference ?? "", trackParams),
        enabled: !!submitted?.reference,
      },
    },
  );

  const meta = data ? STATUS_META[data.status] ?? STATUS_META.pending : null;
  const StatusIcon = meta?.icon ?? Clock;

  return (
    <PublicLayout>
      <SEO
        title="Cek Status Donasi"
        description="Cek status donasi BerugakNews memakai nomor referensi."
        url="/donasi/lacak"
      />

      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="mx-auto max-w-xl">
          <h1 className="font-serif text-2xl font-black md:text-3xl">Cek Status Donasi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Masukkan nomor referensi yang kamu terima setelah mengirim donasi.
          </p>

          <Card className="mt-6">
            <CardContent className="p-5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmitted({ reference: reference.trim().toUpperCase(), email: email.trim() });
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="reference">Nomor Referensi *</Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="BGK-DON-2026-123456"
                    className="font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email (opsional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email yang dipakai saat donasi"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isFetching}>
                  <Search className="mr-2 h-4 w-4" />
                  {isFetching ? "Mencari..." : "Cek Status"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {submitted && isError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Referensi tidak ditemukan atau email tidak cocok. Periksa kembali nomor referensimu.
            </div>
          )}

          {data && meta && (
            <div className="mt-6 space-y-4">
              <div className={`rounded-xl px-5 py-4 ${meta.className}`}>
                <div className="flex items-center gap-3">
                  <StatusIcon className="h-6 w-6 shrink-0" />
                  <div>
                    <p className="font-bold">{meta.label}</p>
                    <p className="text-sm opacity-90">{meta.description}</p>
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="space-y-3 p-5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Referensi</span>
                    <span className="font-mono font-semibold">{data.referenceNumber}</span>
                  </div>
                  {data.campaignTitle && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Campaign</span>
                      <span className="text-right font-medium">{data.campaignTitle}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Nominal</span>
                    <span className="font-bold text-primary">
                      {data.amount
                        ? formatRupiah(data.amount)
                        : data.cryptoAmount
                          ? `${data.cryptoAmount}`
                          : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Metode</span>
                    <span className="font-medium uppercase">{data.method}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Dikirim</span>
                    <span className="font-medium">
                      {data.createdAt
                        ? new Date(data.createdAt).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "-"}
                    </span>
                  </div>
                  {data.adminNote && (
                    <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs">
                      <span className="font-semibold">Catatan admin: </span>
                      {data.adminNote}
                    </div>
                  )}
                  {data.campaignSlug && (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/donasi/${data.campaignSlug}`}>Lihat campaign</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
