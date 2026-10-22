import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListAdminUsers, useCreateAdminUser, useDeleteAdminUser, useUpdateAdminUser, getListAdminUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Users, Trash2, Pencil, ShieldCheck, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ROLE_LABELS: Record<string, string> = {
  owner: "Pemilik",
  editor: "Editor",
  journalist: "Jurnalis",
  reviewer: "Reviewer",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-red-100 text-red-800",
  editor: "bg-blue-100 text-blue-800",
  journalist: "bg-green-100 text-green-800",
  reviewer: "bg-yellow-100 text-yellow-800",
};

const formSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  role: z.enum(["owner", "editor", "journalist", "reviewer"]),
});

type FormValues = z.infer<typeof formSchema>;

export default function AdminUserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editUser, setEditUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: users, isLoading } = useListAdminUsers();
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const deleteMutation = useDeleteAdminUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as any),
    defaultValues: { username: "", password: "", email: "", role: "editor" },
  });

  function openCreate() {
    setEditUser(null);
    form.reset({ username: "", password: "", email: "", role: "editor" });
    setShowForm(true);
  }

  function openEdit(user: any) {
    setEditUser(user);
    form.reset({ username: user.username, password: "", email: user.email || "", role: user.role });
    setShowForm(true);
  }

  function onSubmit(values: FormValues) {
    const payload: any = {
      username: values.username,
      role: values.role,
      email: values.email || undefined,
    };
    if (values.password) payload.password = values.password;

    if (editUser) {
      updateMutation.mutate(
        { id: editUser.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Pengguna diperbarui" });
            queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
            setShowForm(false);
          },
          onError: () => toast({ variant: "destructive", title: "Gagal memperbarui pengguna" }),
        }
      );
    } else {
      if (!values.password) { form.setError("password", { message: "Password wajib diisi untuk pengguna baru" }); return; }
      createMutation.mutate(
        { data: { ...payload, password: values.password! } },
        {
          onSuccess: () => {
            toast({ title: "Pengguna berhasil ditambahkan" });
            queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
            setShowForm(false);
          },
          onError: () => toast({ variant: "destructive", title: "Gagal menambahkan pengguna" }),
        }
      );
    }
  }

  function handleDelete(user: any) {
    if (!confirm(`Hapus pengguna "${user.username}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    deleteMutation.mutate(
      { id: user.id },
      {
        onSuccess: () => {
          toast({ title: "Pengguna dihapus" });
          queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        },
        onError: () => toast({ variant: "destructive", title: "Gagal menghapus pengguna" }),
      }
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const currentUserId = (() => {
    try { const t = localStorage.getItem("admin_token"); if (!t) return null; const p = JSON.parse(atob(t.split(".")[1])); return p.id; } catch { return null; }
  })();

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manajemen Pengguna</h1>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Pengguna
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {users?.length ?? 0} Pengguna Admin Terdaftar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {users?.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{user.username}</span>
                        {user.id === currentUserId && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Anda</span>
                        )}
                      </div>
                      {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role ?? "editor"] ?? "bg-gray-100 text-gray-800"}`}>
                      {ROLE_LABELS[user.role ?? "editor"] ?? user.role}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {user.id !== currentUserId && (
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(user)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl><Input placeholder="username" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editUser ? "Password Baru (kosongkan jika tidak diganti)" : "Password"}</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opsional)</FormLabel>
                    <FormControl><Input placeholder="email@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="owner">Pemilik (Owner)</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="journalist">Jurnalis</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? "Menyimpan..." : (editUser ? "Simpan Perubahan" : "Tambah Pengguna")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
