import { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetAdminArticle, getGetAdminArticleQueryKey, useCreateArticle, useUpdateArticle, useListCategories } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  excerpt: z.string().min(10, "Kutipan minimal 10 karakter"),
  content: z.string().min(20, "Konten terlalu pendek"),
  imageUrl: z.string().url("URL gambar tidak valid").optional().or(z.literal("")),
  categoryId: z.coerce.number().optional().nullable(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

export default function AdminArticleForm() {
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;
  const id = isEdit ? parseInt(params.id!) : undefined;
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: categories } = useListCategories();
  const { data: article, isLoading: loadingArticle } = useGetAdminArticle(id!, {
    query: { enabled: isEdit, queryKey: getGetAdminArticleQueryKey(id!) }
  });

  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      excerpt: "",
      content: "",
      imageUrl: "",
      categoryId: null,
      isPublished: false,
      isFeatured: false,
    },
  });

  const initRef = useRef(false);

  useEffect(() => {
    if (isEdit && article && !initRef.current) {
      initRef.current = true;
      form.reset({
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        imageUrl: article.imageUrl || "",
        categoryId: article.categoryId,
        isPublished: article.isPublished,
        isFeatured: article.isFeatured,
      });
    }
  }, [article, isEdit, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      ...values,
      imageUrl: values.imageUrl || null,
      categoryId: values.categoryId || null,
    };

    if (isEdit) {
      updateMutation.mutate(
        { id: id!, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Artikel diperbarui" });
            setLocation("/admin/artikel");
          },
          onError: () => {
            toast({ variant: "destructive", title: "Gagal memperbarui artikel" });
          }
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Artikel berhasil dibuat" });
            setLocation("/admin/artikel");
          },
          onError: () => {
            toast({ variant: "destructive", title: "Gagal membuat artikel" });
          }
        }
      );
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingArticle) {
    return (
      <AdminLayout>
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/artikel" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {isEdit ? "Edit Artikel" : "Tulis Artikel Baru"}
          </h1>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-6 lg:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Judul Artikel</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan judul artikel yang menarik" className="text-lg py-6" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kutipan (Excerpt)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ringkasan singkat artikel untuk ditampilkan di halaman depan" 
                          className="resize-none h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Maksimal disarankan 150 karakter.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Konten HTML</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="<p>Tulis konten artikel Anda di sini menggunakan tag HTML dasar...</p>" 
                          className="font-mono text-sm min-h-[400px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>Gunakan tag HTML (h2, p, strong, ul, li) untuk memformat konten.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6 lg:border-l lg:border-border lg:pl-8">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))} 
                        value={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Tanpa Kategori</SelectItem>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Gambar Utama</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} />
                      </FormControl>
                      {field.value && (
                        <div className="mt-4 rounded-md overflow-hidden border border-border">
                          <img src={field.value} alt="Preview" className="w-full h-32 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t border-border pt-6 space-y-6">
                  <FormField
                    control={form.control}
                    name="isPublished"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Publikasikan</FormLabel>
                          <FormDescription>
                            Artikel dapat dilihat publik
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-muted/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Jadikan Sorotan</FormLabel>
                          <FormDescription>
                            Tampil di bagian atas beranda
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-6">
                  <Button type="submit" className="w-full h-12 text-md font-bold" disabled={isPending}>
                    <Save className="w-5 h-5 mr-2" />
                    {isPending ? "Menyimpan..." : "Simpan Artikel"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </AdminLayout>
  );
}
