import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/public-layout";

export default function NotFound() {
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-destructive/10 p-6">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h1 className="mb-2 font-serif text-3xl font-bold text-foreground">404</h1>
          <p className="mb-2 text-lg font-semibold text-foreground">Halaman Tidak Ditemukan</p>
          <p className="mb-8 text-sm text-muted-foreground">
            Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" /> Kembali ke Beranda
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/cari">
                <Search className="mr-2 h-4 w-4" /> Cari Artikel
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}