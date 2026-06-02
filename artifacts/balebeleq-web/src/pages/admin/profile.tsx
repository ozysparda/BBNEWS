import { useState } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, User, Lock, Clock, FileText, Activity } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function authFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem("admin_token");
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
}

function roleBadge(role: string) {
  const map: Record<string, string> = { owner: "bg-amber-100 text-amber-800", editor: "bg-blue-100 text-blue-800", journalist: "bg-green-100 text-green-800", reviewer: "bg-purple-100 text-purple-800" };
  return map[role] ?? "bg-gray-100 text-gray-800";
}
function roleLabel(role: string) {
  const map: Record<string, string> = { owner: "Pemilik", editor: "Editor", journalist: "Jurnalis", reviewer: "Reviewer" };
  return map[role] ?? role;
}

export default function AdminProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [emailEditing, setEmailEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const r = await authFetch("/api/admin/profile");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: logData, isLoading: logLoading } = useQuery({
    queryKey: ["admin-activity-log"],
    queryFn: async () => {
      const r = await authFetch("/api/admin/activity-log?limit=10");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const r = await authFetch("/api/admin/profile/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Gagal"); }
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Password berhasil diubah" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    },
    onError: (err: Error) => toast({ variant: "destructive", title: err.message }),
  });

  const updateEmailMutation = useMutation({
    mutationFn: async () => {
      const r = await authFetch("/api/admin/profile", {
        method: "PUT",
        body: JSON.stringify({ email }),
      });
      if (!r.ok) throw new Error("Gagal");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Email diperbarui" });
      setEmailEditing(false);
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
    },
    onError: () => toast({ variant: "destructive", title: "Gagal memperbarui email" }),
  });

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Password baru tidak cocok" });
      return;
    }
    changePasswordMutation.mutate();
  }

  const isOwner = (user as any)?.role === "owner";

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const logs = logData?.logs ?? [];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profil Saya</h1>
        <p className="text-muted-foreground mt-1">Kelola informasi akun dan keamanan Anda</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Profile info */}
        <div className="lg:col-span-1 space-y-5">
          {/* Avatar & info */}
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-3xl mx-auto mb-4">
              {profile?.username?.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-foreground">{profile?.username}</h2>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${roleBadge(profile?.role)}`}>
              {roleLabel(profile?.role)}
            </span>
            {profile?.email && (
              <p className="text-sm text-muted-foreground mt-2">{profile.email}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Bergabung {profile?.createdAt ? format(new Date(profile.createdAt), "d MMMM yyyy", { locale: idLocale }) : "-"}
            </p>
          </div>

          {/* Stats */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Statistik</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Total Artikel</span>
                </div>
                <span className="font-bold text-foreground">{profile?.articleCount ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Terakhir Upload</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {profile?.lastUpload
                    ? format(new Date(profile.lastUpload), "d MMM yyyy", { locale: idLocale })
                    : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Update email */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Email
            </h3>
            {emailEditing ? (
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateEmailMutation.mutate()} disabled={updateEmailMutation.isPending} className="flex-1">
                    {updateEmailMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Simpan"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEmailEditing(false)} className="flex-1">Batal</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{profile?.email || "Belum diset"}</span>
                <Button size="sm" variant="outline" onClick={() => { setEmail(profile?.email ?? ""); setEmailEditing(true); }}>
                  Ubah
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Change password */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2 mb-5">
              <Lock className="w-4 h-4 text-primary" />
              Ganti Password
            </h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Password Saat Ini</Label>
                <Input
                  type="password"
                  placeholder="Masukkan password saat ini"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password Baru</Label>
                <Input
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Konfirmasi Password Baru</Label>
                <Input
                  type="password"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Password tidak cocok</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="w-full"
              >
                {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ganti Password
              </Button>
            </form>
          </div>

          {/* Activity log */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="font-semibold text-base text-foreground flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-primary" />
              {isOwner ? "Log Aktivitas Semua Pengguna" : "Riwayat Aktivitas Saya"}
            </h3>
            {logLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada aktivitas</p>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                {logs.map((log: any) => (
                  <div key={log.id} className="py-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {log.adminUsername?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isOwner && <span className="text-xs font-semibold text-foreground">{log.adminUsername}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.action.startsWith("Buat") ? "bg-green-100 text-green-700" :
                          log.action.startsWith("Edit") ? "bg-blue-100 text-blue-700" :
                          log.action.startsWith("Hapus") ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {log.action}
                        </span>
                      </div>
                      {log.articleTitle && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.articleTitle}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {format(new Date(log.createdAt), "d MMM HH:mm", { locale: idLocale })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
