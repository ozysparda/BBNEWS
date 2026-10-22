import { PublicLayout } from "@/components/layout/public-layout";
import { SEO } from "@/components/seo";
import { ComplaintForm } from "@/components/complaint-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Shield, Clock, FileCheck } from "lucide-react";

export default function ComplaintPage() {
  return (
    <>
      <SEO
        title="Aduan Masyarakat"
        description="Laporkan masalah infrastruktur, pelayanan, dan lingkungan. Tim kami akan merespon dengan cepat."
        url="/aduan"
      />
      <PublicLayout>
        <div className="container mx-auto px-4 py-10 sm:py-16">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <h1 className="mb-3 font-serif text-3xl font-bold text-foreground sm:text-4xl">
              Sistem Aduan Masyarakat
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
              Lapor masalah atau keluhan Anda tentang infrastruktur perkotaan, pelayanan, dan masalah lingkungan lainnya. Tim kami akan merespon dengan cepat.
            </p>
          </div>

          {/* Info Cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Transparan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Lacak status aduan Anda secara real-time dengan nomor unik yang diberikan.
                </p>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileCheck className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Aman</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Data pribadi Anda dilindungi dan tidak akan dibagikan kepada pihak ketiga.
                </p>
              </CardContent>
            </Card>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Responsif</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Tim profesional kami siap memproses dan menyelesaikan aduan Anda dengan cepat.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Form Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Buat Aduan Baru</CardTitle>
              <CardDescription>Isi formulir di bawah ini dengan detail lengkap tentang masalah yang ingin Anda laporkan</CardDescription>
            </CardHeader>
            <CardContent>
              <ComplaintForm />
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Pertanyaan Umum</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground">Berapa lama waktu pemrosesan aduan?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rata-rata aduan diproses dalam 1-3 hari kerja. Untuk kasus urgent, kami prioritaskan.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Apakah data saya aman?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Ya, kami menggunakan enkripsi tingkat enterprise untuk melindungi data pribadi Anda.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Bagaimana saya melacak aduan saya?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Anda akan menerima nomor referensi unik. Gunakan nomor ini untuk melacak status di situs kami.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">File apa yang bisa saya upload?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Anda dapat mengunggah foto (JPG, PNG, WebP), video (MP4), dan dokumen (PDF) dengan maksimal 50MB per file.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    </>
  );
}