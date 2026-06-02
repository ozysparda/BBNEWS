import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListCategories, useCreateCategory, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Plus, Tags } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  name: z.string().min(2, "Nama kategori minimal 2 karakter"),
  slug: z.string().min(2, "Slug minimal 2 karakter").regex(/^[a-z0-9-]+$/, "Hanya huruf kecil, angka, dan strip"),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Gunakan format hex warna (contoh: #ff0000)"),
});

export default function AdminCategoryList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useListCategories();
  const createMutation = useCreateCategory();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      color: "#1e40af",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Kategori berhasil ditambahkan" });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          form.reset();
        },
        onError: () => {
          toast({ variant: "destructive", title: "Gagal menambahkan kategori" });
        }
      }
    );
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (v: string) => void) => {
    const name = e.target.value;
    onChange(name);
    
    if (!form.formState.touchedFields.slug) {
      const slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      form.setValue("slug", slug);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Kelola Kategori</h1>
        <p className="text-muted-foreground mt-1">Tambahkan dan atur kategori artikel Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="w-5 h-5" />
                Daftar Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : categories?.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                  Belum ada kategori terdaftar.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {categories?.map((category) => (
                    <div key={category.id} className="flex flex-col justify-between p-4 border rounded-xl bg-muted/20">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{category.name}</h3>
                          <p className="text-sm text-muted-foreground font-mono">/{category.slug}</p>
                        </div>
                        <div 
                          className="w-6 h-6 rounded-full border border-border shadow-sm" 
                          style={{ backgroundColor: category.color }}
                        />
                      </div>
                      <Badge variant="secondary" className="w-fit">
                        {category.articleCount || 0} Artikel
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Tambah Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Kategori</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Contoh: Politik" 
                            {...field} 
                            onChange={(e) => handleNameChange(e, field.onChange)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug URL</FormLabel>
                        <FormControl>
                          <Input placeholder="politik" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Warna Badge</FormLabel>
                        <div className="flex gap-3">
                          <FormControl>
                            <Input type="color" className="w-14 p-1 h-10" {...field} />
                          </FormControl>
                          <FormControl>
                            <Input className="flex-1 uppercase font-mono" {...field} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full mt-4" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Menyimpan..." : "Simpan Kategori"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
