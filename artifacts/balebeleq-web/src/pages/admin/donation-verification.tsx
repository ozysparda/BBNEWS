import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetDonationVerificationStatus,
  useListDonationVerificationRuns,
  useLoginDonationVerification,
  useLogoutDonationVerification,
  useRequestDonationVerificationOtp,
  useRunDonationVerification,
  useUpdateDonationVerificationSettings,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Loader2, LogIn, LogOut, RefreshCw, ShieldCheck, Zap } from "lucide-react";

function formatDateTime(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatRupiah(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

export default function AdminDonationVerificationPage() {
  const [, setLocation] = useLocation();

  const statusQuery = useGetDonationVerificationStatus();
  const runsQuery = useListDonationVerificationRuns({ limit: 15 });

  const requestOtp = useRequestDonationVerificationOtp();
  const login = useLoginDonationVerification();
  const logout = useLogoutDonationVerification();
  const runCheck = useRunDonationVerification();
  const updateSettings = useUpdateDonationVerificationSettings();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState("");
  const [windowMinutes, setWindowMinutes] = useState("60");
  const [lastResult, setLastResult] = useState<string | null>(null);

  const status = statusQuery.data;
  const connected = status?.connected === true;

  useEffect(() => {
    if (!status) return;
    if (status.phoneNumber) setPhoneNumber(status.phoneNumber);
    if (status.autoVerifyWindowMinutes) {
      setWindowMinutes(String(status.autoVerifyWindowMinutes));
    }
  }, [status]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    const phone = phoneNumber.trim();
    if (!phone) {
      toast.error("Nomor HP akun GoPay Merchant wajib diisi");
      return;
    }
    try {
      const result = await requestOtp.mutateAsync({ data: { phoneNumber: phone } });
      setOtpSent(true);
      setOtpHint(result.message ?? "");
      toast.success("Kode OTP dikirim ke HP merchant");
    } catch (error: any) {
      toast.error(error?.message || "Gagal meminta kode OTP");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.trim();
    if (!code) {
      toast.error("Kode OTP wajib diisi");
      return;
    }
    try {
      const result = await login.mutateAsync({ data: { otp: code } });
      setOtp("");
      setOtpSent(false);
      toast.success(result.message || "Berhasil terhubung ke GoPay Merchant");
      statusQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Gagal login ke GoPay Merchant");
    }
  }

  async function handleLogout() {
    try {
      await logout.mutateAsync();
      toast.success("Sesi GoPay Merchant diputus");
      statusQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Gagal memutus sesi");
    }
  }

  async function handleRunNow() {
    try {
      const result = await runCheck.mutateAsync({
        data: { windowMinutes: Number(windowMinutes) || 60 },
      });
      setLastResult(result.message ?? null);
      if (result.status === "error") {
        toast.error(result.message);
      } else if (result.matchedCount > 0) {
        toast.success(`${result.matchedCount} donasi terverifikasi otomatis`);
      } else {
        toast.info(result.message || "Tidak ada mutasi baru yang cocok");
      }
      statusQuery.refetch();
      runsQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menjalankan verifikasi");
    }
  }

  async function handleToggleAuto(next: boolean) {
    try {
      await updateSettings.mutateAsync({
        data: {
          autoVerifyEnabled: next,
          autoVerifyWindowMinutes: Number(windowMinutes) || 60,
        },
      });
      toast.success(
        next
          ? "Auto-verifikasi dinyalakan. Pastikan pemicu otomatis sudah aktif."
          : "Auto-verifikasi dimatikan.",
      );
      statusQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menyimpan setelan");
    }
  }

  const runs = runsQuery.data ?? [];
  const lastAutoRun = runs.find((run) => run.source === "auto") ?? null;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/donasi")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Verifikasi Donasi Otomatis</h1>
            <p className="text-sm text-muted-foreground">
              QRIS statis tidak mengirim webhook, jadi mutasi masuk dibaca langsung dari akun
              GoPay Merchant milikmu sendiri - gratis, tanpa pihak ketiga.
            </p>
          </div>
        </div>

        {statusQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Status Koneksi GoPay Merchant</h2>
                  {connected ? (
                    <Badge className="bg-emerald-600 text-white">Terhubung</Badge>
                  ) : (
                    <Badge variant="secondary">Belum terhubung</Badge>
                  )}
                </div>
                {connected && (
                  <Button variant="outline" size="sm" onClick={handleLogout} disabled={logout.isPending}>
                    {logout.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    Putuskan Sesi
                  </Button>
                )}
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Nomor HP merchant</p>
                  <p className="font-medium">{status?.phoneNumber || "-"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Merchant ID</p>
                  <p className="font-mono text-xs break-all">{status?.merchantId || "-"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Transaksi menunggu</p>
                  <p className="font-medium">{status?.pendingCount ?? 0} transaksi</p>
                </div>
              </div>

              <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                <p>Sesi disimpan: {formatDateTime(status?.sessionUpdatedAt)}</p>
                <p>Mutasi terakhir dicek: {formatDateTime(status?.lastCheckedAt)}</p>
              </div>

              {!connected && (
                <form onSubmit={otpSent ? handleLogin : handleRequestOtp} className="space-y-3 rounded-lg border border-border p-4">
                  <h3 className="text-sm font-semibold">Hubungkan Akun GoPay Merchant</h3>
                  <p className="text-xs text-muted-foreground">
                    Kode OTP dikirim ke HP akun merchant itu sendiri (tidak pernah lewat
                    server kami). Sesi disimpan terenkripsi di database.
                  </p>

                  {!otpSent ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="phoneNumber">Nomor HP GoPay Merchant</Label>
                        <Input
                          id="phoneNumber"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="081234567890"
                          inputMode="tel"
                        />
                      </div>
                      <Button type="submit" disabled={requestOtp.isPending}>
                        {requestOtp.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <LogIn className="mr-2 h-4 w-4" />
                        )}
                        Kirim OTP
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1 space-y-1.5">
                        <Label htmlFor="otp">Kode OTP (SMS)</Label>
                        <Input
                          id="otp"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          placeholder="1234"
                          inputMode="numeric"
                          maxLength={8}
                        />
                      </div>
                      <Button type="submit" disabled={login.isPending}>
                        {login.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        Verifikasi & Simpan Sesi
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setOtpSent(false);
                          setOtp("");
                        }}
                      >
                        Ganti nomor
                      </Button>
                    </div>
                  )}

                  {otpHint && <p className="text-xs text-muted-foreground">{otpHint}</p>}
                </form>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Opsi 1 - Verifikasi Manual</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Tarik mutasi QRIS sekarang, lalu cocokkan dengan transaksi yang masih
                menunggu. Transaksi yang cocok langsung berubah jadi "terverifikasi".
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="windowMinutes">Rentang feed (menit ke belakang)</Label>
                <Input
                  id="windowMinutes"
                  type="number"
                  min={5}
                  max={10080}
                  value={windowMinutes}
                  onChange={(e) => setWindowMinutes(e.target.value)}
                  className="max-w-40"
                />
              </div>

              <Button onClick={handleRunNow} disabled={runCheck.isPending || !connected}>
                {runCheck.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Cek Mutasi Sekarang
              </Button>

              {!connected && (
                <p className="text-xs text-muted-foreground">
                  Hubungkan akun GoPay Merchant dulu sebelum melakukan pengecekan mutasi.
                </p>
              )}
              {lastResult && <p className="text-sm">{lastResult}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Opsi 2 - Verifikasi Otomatis</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Server akan memeriksa mutasi secara berkala lewat pemicu gratis
                (GitHub Actions cron atau worker di host Always Free). Donatur tidak
                perlu menunggu admin menekan tombol.
              </p>

              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Auto-verifikasi</p>
                  <p className="text-xs text-muted-foreground">
                    Saat aktif, pemicu otomatis akan memverifikasi transaksi pending.
                  </p>
                </div>
                <Switch
                  checked={status?.autoVerifyEnabled === true}
                  onCheckedChange={handleToggleAuto}
                  disabled={updateSettings.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="autoWindow">Rentang feed otomatis (menit)</Label>
                <Input
                  id="autoWindow"
                  type="number"
                  min={5}
                  max={10080}
                  value={windowMinutes}
                  onChange={(e) => setWindowMinutes(e.target.value)}
                  className="max-w-40"
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold">Pemicu otomatis (gratis)</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Repo GitHub Actions (cron tiap 5 menit) atau worker 10 detik di Oracle
                  Cloud Always Free memanggil endpoint internal dengan header
                  x-cron-secret (env CRON_SECRET). Kredensial GoPay tetap di server -
                  mesin pemicu hanya butuh satu secret.
                </p>
                <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-2 text-[11px] text-slate-100">
{`curl -X POST https://berugaknews.com/api/internal/donations/verify/run \\
  -H "x-cron-secret: $CRON_SECRET"`}
                </pre>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>
                  Run otomatis terakhir:{" "}
                  {lastAutoRun ? formatDateTime(lastAutoRun.createdAt) : "belum pernah"}
                </p>
                {lastAutoRun && (
                  <p>
                    Hasil: {lastAutoRun.status} - {lastAutoRun.message || "-"} (
                    {lastAutoRun.matchedCount} terverifikasi)
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-semibold">Riwayat Pemeriksaan Mutasi</h2>
            {runsQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada pemeriksaan mutasi.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Sumber</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mutasi</TableHead>
                      <TableHead>Terverifikasi</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Catatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateTime(run.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={run.source === "auto" ? "default" : "secondary"}>
                            {run.source === "auto" ? "Otomatis" : "Manual"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              run.status === "ok"
                                ? "default"
                                : run.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{run.feedCount}</TableCell>
                        <TableCell>{run.matchedCount}</TableCell>
                        <TableCell>
                          {run.pendingBefore} &rarr; {run.pendingAfter}
                        </TableCell>
                        <TableCell className="max-w-64 text-xs text-muted-foreground">
                          {run.message || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
