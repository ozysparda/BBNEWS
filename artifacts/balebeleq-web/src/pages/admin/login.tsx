import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Lock, User } from "lucide-react";
const logoImg = `${import.meta.env.BASE_URL}logo-berugak.png`;

const formSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useAdminLogin();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          localStorage.setItem("admin_token", data.token);
          toast({
            title: "Login berhasil",
            description: "Selamat datang di panel admin.",
          });
          setLocation("/admin/dashboard");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Login gagal",
            description: "Username atau password salah.",
          });
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src={logoImg}
            alt="BerugakNews Logo"
            className="h-24 w-24 object-contain mx-auto mb-4 drop-shadow-md"
          />
          <h1 className="text-3xl font-serif font-bold text-foreground">Berugak News</h1>
          <p className="text-muted-foreground mt-1 font-medium tracking-widest uppercase text-xs">
            Administration Portal
          </p>
          <p className="text-muted-foreground/60 text-xs mt-1 italic">
            Informasi · Budaya · Aspirasi
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <h2 className="text-xl font-bold mb-6">Login Sistem</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="admin"
                            className="pl-10"
                            autoComplete="username"
                            data-testid="input-username"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="••••••••"
                            className="pl-10"
                            autoComplete="current-password"
                            data-testid="input-password"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full mt-2 py-6 text-md font-bold"
                  disabled={loginMutation.isPending}
                  data-testid="button-submit"
                >
                  {loginMutation.isPending ? "Memverifikasi..." : "Masuk"}
                </Button>
              </form>
            </Form>
          </div>
          <div className="bg-muted/50 p-4 text-center border-t border-border">
            <p className="text-xs text-muted-foreground">
              Akses terbatas hanya untuk administrator yang sah.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
