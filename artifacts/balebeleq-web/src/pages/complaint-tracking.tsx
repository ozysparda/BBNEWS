import { useState } from "react";
import { Link } from "wouter";
import { getTrackComplaintQueryKey, useTrackComplaint } from "@workspace/api-client-react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/seo";

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu ditinjau",
  verified: "Terverifikasi",
  in_progress: "Sedang diproses",
  completed: "Selesai",
};

export default function ComplaintTracking() {
  const [complaintNumber, setComplaintNumber] = useState("");
  const [email, setEmail] = useState("");
  const [submittedParams, setSubmittedParams] = useState({ complaintNumber: "", email: "" });
  const tracking = useTrackComplaint(submittedParams, {
    query: {
      queryKey: getTrackComplaintQueryKey(submittedParams),
      enabled: Boolean(submittedParams.complaintNumber && submittedParams.email),
      retry: false,
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedParams({
      complaintNumber: complaintNumber.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
    });
  }

  const trackingError = tracking.error as { data?: { error?: string }; message?: string } | null;

  return (
    <>
      <SEO
        title="Lacak Aduan Masyarakat"
        description="Lacak perkembangan aduan masyarakat BerugakNews menggunakan nomor aduan dan email pelapor."
        url="/aduan/lacak"
      />
      <main className="min-h-screen bg-muted/30 px-4 py-10 sm:py-16">
        <div className="mx-auto max-w-xl">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke BerugakNews
          </Link>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <CardTitle className="font-serif text-2xl">Lacak Aduan Masyarakat</CardTitle>
              <CardDescription>
                Masukkan nomor aduan dan email yang digunakan saat mengirim laporan. Data aduan hanya ditampilkan
                setelah keduanya cocok.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tracking-number">Nomor Aduan</Label>
                  <Input
                    id="tracking-number"
                    value={complaintNumber}
                    onChange={(event) => setComplaintNumber(event.target.value)}
                    placeholder="Contoh: BGK-2026-12345"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tracking-email">Email Pelapor</Label>
                  <Input
                    id="tracking-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email yang digunakan saat melapor"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={tracking.isFetching}>
                  <Search className="mr-2 h-4 w-4" />
                  {tracking.isFetching ? "Memeriksa..." : "Lacak Status"}
                </Button>
              </form>

              {tracking.isError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  {trackingError?.data?.error || trackingError?.message || "Nomor aduan atau email tidak ditemukan."}
                </div>
              )}

              {tracking.data && (
                <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nomor Aduan</p>
                      <p className="font-mono font-semibold text-foreground">{tracking.data.complaintNumber}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Judul</p>
                    <p className="font-medium text-foreground">{tracking.data.title}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                    <p className="font-semibold text-primary">
                      {STATUS_LABELS[tracking.data.status] || tracking.data.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Balasan Petugas</p>
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      {tracking.data.adminResponse || "Belum ada balasan. Silakan cek kembali setelah laporan ditinjau."}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Diperbarui: {new Date(tracking.data.updatedAt).toLocaleString("id-ID")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}