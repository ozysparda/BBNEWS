import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useDeviceInfo, getLocationCoordinates } from '@/hooks/useDeviceInfo';
import { Loader2, MapPin, Upload, X } from 'lucide-react';

const COMPLAINT_CATEGORIES = [
  'Jalan Rusak',
  'Saluran Air',
  'Kebersihan',
  'Lampu Jalan',
  'Keamanan',
  'Parkir',
  'Lainnya',
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function ComplaintForm() {
  const deviceInfo = useDeviceInfo();
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    category: '',
    title: '',
    description: '',
    latitude: 0,
    longitude: 0,
    address: '',
    city: '',
    province: '',
    country: '',
    agreementAccepted: false,
  });

  const [files, setFiles] = useState<{
    photo: File | null;
    video: File | null;
    pdf: File | null;
  }>({
    photo: null,
    video: null,
    pdf: null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, agreementAccepted: checked }));
  };

  const validateFile = (file: File, allowedTypes: string[]): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File terlalu besar. Maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return false;
    }
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Tipe file tidak didukung: ${file.type}`);
      return false;
    }
    return true;
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file, ALLOWED_IMAGE_TYPES)) {
      setFiles((prev) => ({ ...prev, photo: file }));
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file, ALLOWED_VIDEO_TYPES)) {
      setFiles((prev) => ({ ...prev, video: file }));
      const reader = new FileReader();
      reader.onload = (event) => {
        setVideoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file, ALLOWED_DOCUMENT_TYPES)) {
      setFiles((prev) => ({ ...prev, pdf: file }));
    }
  };

  const handleGetLocation = async () => {
    setLoading(true);
    try {
      const { latitude, longitude } = await getLocationCoordinates();
      setFormData((prev) => ({
        ...prev,
        latitude,
        longitude,
      }));
      toast.success('Lokasi berhasil didapat');
    } catch (error) {
      toast.error('Gagal mendapat lokasi. Periksa izin lokasi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.category || !formData.title || !formData.description) {
      toast.error('Lengkapi semua field yang diperlukan');
      return;
    }

    if (!formData.agreementAccepted) {
      toast.error('Setujui perjanjian untuk melanjutkan');
      return;
    }

    setLoading(true);

    try {
      // Upload files if exist
      let photoUrl, videoUrl, pdfUrl;

      if (files.photo) {
        const photoFormData = new FormData();
        photoFormData.append('file', files.photo);
        const photoRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: photoFormData,
        });
        const photoData = await photoRes.json();
        photoUrl = photoData.url;
      }

      if (files.video) {
        const videoFormData = new FormData();
        videoFormData.append('file', files.video);
        const videoRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: videoFormData,
        });
        const videoData = await videoRes.json();
        videoUrl = videoData.url;
      }

      if (files.pdf) {
        const pdfFormData = new FormData();
        pdfFormData.append('file', files.pdf);
        const pdfRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: pdfFormData,
        });
        const pdfData = await pdfRes.json();
        pdfUrl = pdfData.url;
      }

      // Submit complaint
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          photoUrl,
          videoUrl,
          pdfUrl,
          deviceName: deviceInfo.deviceName,
          deviceType: deviceInfo.deviceType,
          operatingSystem: deviceInfo.operatingSystem,
          browser: deviceInfo.browser,
          browserVersion: deviceInfo.browserVersion,
          screenResolution: deviceInfo.screenResolution,
          timezone: deviceInfo.timezone,
          localTime: deviceInfo.localTime,
          language: deviceInfo.language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit complaint');
      }

      const data = await response.json();
      toast.success(`Aduan berhasil dikirim! No: ${data.complaintNumber}`);

      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phoneNumber: '',
        category: '',
        title: '',
        description: '',
        latitude: 0,
        longitude: 0,
        address: '',
        city: '',
        province: '',
        country: '',
        agreementAccepted: false,
      });
      setFiles({ photo: null, video: null, pdf: null });
      setPhotoPreview(null);
      setVideoPreview(null);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast.error('Gagal mengirim aduan. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="text"
          name="fullName"
          placeholder="Nama Lengkap"
          value={formData.fullName}
          onChange={handleInputChange}
          required
        />
        <Input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
        <Input
          type="tel"
          name="phoneNumber"
          placeholder="Nomor Telepon"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          required
        />
        <Select value={formData.category} onValueChange={handleSelectChange}>
          <SelectTrigger>
            <SelectValue placeholder="Kategori Aduan" />
          </SelectTrigger>
          <SelectContent>
            {COMPLAINT_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Input
        type="text"
        name="title"
        placeholder="Judul Aduan"
        value={formData.title}
        onChange={handleInputChange}
        required
      />

      <Textarea
        name="description"
        placeholder="Deskripsi Aduan"
        value={formData.description}
        onChange={handleInputChange}
        rows={4}
        required
      />

      {/* Location */}
      <div className="space-y-2">
        <Button type="button" onClick={handleGetLocation} disabled={loading} className="w-full">
          <MapPin className="w-4 h-4 mr-2" />
          Ambil Lokasi
        </Button>
        {formData.latitude !== 0 && formData.longitude !== 0 && (
          <p className="text-sm text-gray-600">
            Lokasi: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          type="text"
          name="address"
          placeholder="Alamat"
          value={formData.address}
          onChange={handleInputChange}
        />
        <Input type="text" name="city" placeholder="Kota" value={formData.city} onChange={handleInputChange} />
        <Input
          type="text"
          name="province"
          placeholder="Provinsi"
          value={formData.province}
          onChange={handleInputChange}
        />
        <Input
          type="text"
          name="country"
          placeholder="Negara"
          value={formData.country}
          onChange={handleInputChange}
        />
      </div>

      {/* File Uploads */}
      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload Foto (JPG, PNG, WebP)</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
          </label>
          {photoPreview && (
            <div className="mt-2 relative">
              <img src={photoPreview} alt="preview" className="w-full h-48 object-cover rounded" />
              <button
                type="button"
                onClick={() => {
                  setPhotoPreview(null);
                  setFiles((prev) => ({ ...prev, photo: null }));
                }}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="border-2 border-dashed rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload Video (MP4)</span>
            <input type="file" accept="video/mp4" onChange={handleVideoChange} className="hidden" />
          </label>
          {videoPreview && <p className="text-sm text-gray-600 mt-2">✓ Video dipilih</p>}
        </div>

        <div className="border-2 border-dashed rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Upload PDF</span>
            <input type="file" accept="application/pdf" onChange={handlePdfChange} className="hidden" />
          </label>
          {files.pdf && <p className="text-sm text-gray-600 mt-2">✓ {files.pdf.name}</p>}
        </div>
      </div>

      {/* Agreement */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="agreement"
          checked={formData.agreementAccepted}
          onCheckedChange={handleCheckboxChange}
        />
        <label htmlFor="agreement" className="text-sm">
          Saya setuju dengan kebijakan privasi dan persyaratan layanan
        </label>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Mengirim...
          </>
        ) : (
          'Kirim Aduan'
        )}
      </Button>
    </form>
  );
}
