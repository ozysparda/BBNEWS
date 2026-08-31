import { ComplaintForm } from '@/components/complaint-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function ComplaintPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="py-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-blue-600 mr-2" />
            <h1 className="text-4xl font-bold text-gray-900">Sistem Aduan Masyarakat</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Lapor masalah atau keluhan Anda tentang infrastruktur perkotaan, pelayanan, dan masalah lingkungan lainnya. Tim kami akan merespon dengan cepat.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transparan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Lacak status aduan Anda secara real-time dengan nomor unik yang diberikan.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aman</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Data pribadi Anda dilindungi dan tidak akan dibagikan kepada pihak ketiga.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Responsif</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Tim profesional kami siap memproses dan menyelesaikan aduan Anda dengan cepat.</p>
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
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Pertanyaan Umum</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Berapa lama waktu pemrosesan aduan?</h3>
              <p className="text-gray-600 text-sm mt-1">Rata-rata aduan diproses dalam 1-3 hari kerja. Untuk kasus urgent, kami prioritaskan.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Apakah data saya aman?</h3>
              <p className="text-gray-600 text-sm mt-1">Ya, kami menggunakan enkripsi tingkat enterprise untuk melindungi data pribadi Anda.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Bagaimana saya melacak aduan saya?</h3>
              <p className="text-gray-600 text-sm mt-1">Anda akan menerima nomor referensi unik. Gunakan nomor ini untuk melacak status di situs kami.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">File apa yang bisa saya upload?</h3>
              <p className="text-gray-600 text-sm mt-1">Anda dapat mengunggah foto (JPG, PNG, WebP), video (MP4), dan dokumen (PDF) dengan maksimal 50MB per file.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
