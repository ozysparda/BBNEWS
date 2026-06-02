import { useEffect, useRef, useState } from "react";
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
import { ChevronLeft, Save, X, ImageIcon, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/rich-text-editor";

const formSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter"),
  excerpt: z.string().min(10, "Kutipan minimal 10 karakter"),
  content: z.string().min(20, "Konten terlalu pendek"),
  imageUrl: z.string().url("URL gambar tidak valid").optional().or(z.literal("")),
  imageCaption: z.string().optional().or(z.literal("")),
  categoryId: z.coerce.number().optional().nullable(),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

async function uploadImage(file: File, token: string): Promise<string> {
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

  const res = await fetch(`${baseUrl}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });

  if (!res.ok) throw new Error("Gagal mendapatkan URL upload");

  const { uploadURL, objectPath } = await res.json();

  const uploadRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) throw new Error("Gagal mengunggah file");

  return `${baseUrl}/api/storage/objects/${objectPath}`;
}

export default function AdminArticleForm() {
  const params = useParams<{ id?: string }>();
  const isEdit = !!params.id;
  const id = isEdit ? parseInt(params.id!) : undefined;

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      imageCaption: "",
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
        imageCaption: (article as any).imageCaption || "",
        categoryId: article.categoryId,
        isPublished: article.isPublished,
        isFeatured: article.isFeatured,
      });
    }
  }, [article, isEdit, form]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "File harus berupa gambar" });
      return;
    }

    const token = localStorage.getItem("admin_token");
    if (!token) { toast({ variant: "destructive", title: "Sesi habis" }); return; }

    setUploading(true);
    try {
      const url = await uploadImage(file, token);
      form.setValue("imageUrl", url);
      toast({ title: "Gambar berhasil diunggah" });
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal mengunggah gambar" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    const payload = {
      ...values,
      imageUrl: values.imageUrl || null,
      imageCaption: values.imageCaption || null,
      categoryId: values.categoryId || null,
    };

    if (isEdit) {
      updateMutation.mutate(
        { id: id!, data: payload as any },
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
        { data: payload as any },
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
  const imageUrl = form.watch("imageUrl");

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
                      <FormLabel className="text-base">Konten Artikel</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Mulai menulis artikel di sini..."
                          minHeight="450px"
                        />
                      </FormControl>
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

                {/* Image Upload Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Gambar Utama</Label>
                  
                  {imageUrl ? (
                    <div className="space-y-2">
                      <div className="relative rounded-lg overflow-hidden border border-border">
                        <img src={imageUrl} alt="Preview" className="w-full h-40 object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        <button
                          type="button"
                          onClick={() => { form.setValue("imageUrl", ""); form.setValue("imageCaption", ""); }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-8 h-8 animate-spin" />
                          <span className="text-sm">Mengunggah...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ImageIcon className="w-8 h-8 opacity-40" />
                          <span className="text-sm font-medium">Klik untuk unggah gambar</span>
                          <span className="text-xs opacity-60">JPG, PNG, WebP maks. 10MB</span>
                        </div>
                      )}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  {/* Manual URL input */}
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">Atau masukkan URL gambar</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" className="text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Image Caption */}
                  {imageUrl && (
                    <FormField
                      control={form.control}
                      name="imageCaption"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Keterangan Foto (opsional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Deskripsi foto..." className="text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

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
                  <Button type="submit" className="w-full h-12 text-md font-bold" disabled={isPending || uploading}>
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
