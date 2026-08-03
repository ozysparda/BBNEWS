import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { AlertTriangle, Check, ChevronDown, MapPin, Send } from "lucide-react";
import { useCreateComplaint } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const COMPLAINT_CATEGORIES = [
  "Jalan Rusak",
  "Saluran Air",
  "Kebersihan",
  "Lampu Jalan",
  "Keamanan",
  "Parkir",
  "Lainnya",
];

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Aduan gagal dikirim. Silakan coba lagi.";
}

export default function ComplaintWidget() {
  const createComplaint = useCreateComplaint();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [country, setCountry] = useState("Indonesia");
  const [truthful, setTruthful] = useState(false);
  const [respectful, setRespectful] = useState(false);
  const [processingConsent, setProcessingConsent] = useState(false);
  const [location, setLocation] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [sentComplaintNumber, setSentComplaintNumber] = useState("");

  function resetForm() {
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setCategory("");
    setTitle("");
    setContent("");
    setAddress("");
    setCity("");
    setProvince("");
    setCountry("Indonesia");
    setTruthful(false);
    setRespectful(false);
    setProcessingConsent(false);
    setLocation("");
    setLocationMessage("");
    setError("");
  }

  function dockWidget() {
    setOpen(false);
    setSent(false);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Browser ini tidak mendukung lokasi.");
      return;
    }
    setLocationLoading(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Round to roughly 100m to avoid storing a precise home address.
        const latitude = position.coords.latitude.toFixed(3);
        const longitude = position.coords.longitude.toFixed(3);
        setLocation(`${latitude}, ${longitude}`);
        setLocationMessage("Lokasi perkiraan siap disertakan.");
        setLocationLoading(false);
      },
      () => {
        setLocationMessage("Lokasi tidak diizinkan. Aduan tetap bisa dikirim tanpa lokasi.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim() || !phoneNumber.trim() || !category || !title.trim() || !content.trim()) {
      setError("Nama, email, nomor telepon, kategori, judul, dan isi laporan wajib diisi.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Format email tidak valid.");
      return;
    }
    if (!truthful || !respectful || !processingConsent) {
      setError("Semua persyaratan wajib dicentang sebelum mengirim.");
      return;
    }

    createComplaint.mutate(
      {
        data: {
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          category,
          title: title.trim(),
          description: content.trim(),
          content: content.trim(),
          agreementAccepted: "true",
          terms: true,
          location: location || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          province: province.trim() || undefined,
          country: country.trim() || undefined,
        },
      },
      {
        onSuccess: (complaint) => {
          resetForm();
          setSentComplaintNumber(complaint.complaintNumber);
          setSent(true);
        },
        onError: (requestError) => setError(getErrorMessage(requestError)),
      },
    );
  }

  if (!open) {
    return (
      <div className="fixed right-0 bottom-24 z-40">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-l-full bg-primary px-3 py-3 text-primary-foreground shadow-lg transition hover:pr-5"
          aria-label="Buka formulir aduan masyarakat"
        >
          <AlertTriangle className="h-5 w-5" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all hover:max-w-32">
            Aduan Masyarakat
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-[min( calc(100vw-2rem),420px)] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
      <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <h2 className="font-semibold">Aduan Masyarakat</h2>
            <p className="text-xs opacity-80">Sampaikan laporan dengan bertanggung jawab</p>
          </div>
        </div>
        <button
          type="button"
          onClick={dockWidget}
          className="rounded-full p-1.5 transition hover:bg-white/20"
          aria-label="Simpan aduan ke tepi layar"
          title="Simpan ke tepi layar"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      {sent ? (
        <div className="px-5 py-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-foreground">Aduan berhasil dikirim</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Terima kasih. Tim kami akan meninjau laporan Anda. Simpan nomor aduan berikut untuk melihat
            perkembangan dan balasan petugas.
          </p>
          <div className="mt-4 rounded-lg bg-muted px-3 py-2 font-mono text-sm font-semibold">
            {sentComplaintNumber}
          </div>
          <Link href="/aduan/lacak" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Lacak status dan balasan aduan
          </Link>
          <Button className="mt-5" onClick={() => setSent(false)}>
            Kirim Aduan Lain
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-h-[min(75vh,680px)] space-y-4 overflow-y-auto p-4">
          <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            Isi data kontak dan lokasi laporan agar tim dapat menindaklanjuti dengan tepat. IP, perangkat,
            dan lokasi browser hanya dapat dilihat admin.
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="complaint-full-name">Nama Lengkap</Label>
              <Input
                id="complaint-full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nama pelapor"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complaint-email">Email</Label>
              <Input
                id="complaint-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complaint-phone">Nomor Telepon</Label>
              <Input
                id="complaint-phone"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="08xxxxxxxxxx"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complaint-category">Kategori Aduan</Label>
              <Select value={category || undefined} onValueChange={setCategory}>
                <SelectTrigger id="complaint-category">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {COMPLAINT_CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="complaint-title">Judul Aduan</Label>
            <Input
              id="complaint-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Contoh: Jalan berlubang di depan pasar"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="complaint-content">Isi laporan</Label>
            <Textarea
              id="complaint-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Jelaskan kejadian, waktu, tempat, dan informasi pendukung..."
              rows={5}
              required
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-semibold text-foreground">Alamat Kejadian (opsional)</p>
            <div className="space-y-2">
              <Label htmlFor="complaint-address">Alamat</Label>
              <Input
                id="complaint-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Nama jalan, dusun, atau patokan"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="complaint-city">Kota/Kabupaten</Label>
                <Input id="complaint-city" value={city} onChange={(event) => setCity(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint-province">Provinsi</Label>
                <Input
                  id="complaint-province"
                  value={province}
                  onChange={(event) => setProvince(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="complaint-country">Negara</Label>
                <Input
                  id="complaint-country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-semibold text-foreground">Persyaratan pengiriman</p>
            <div className="space-y-2.5">
              <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
                <Checkbox checked={truthful} onCheckedChange={(value) => setTruthful(value === true)} />
                <span>Saya menyampaikan informasi yang benar dan dapat dipertanggungjawabkan.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
                <Checkbox checked={respectful} onCheckedChange={(value) => setRespectful(value === true)} />
                <span>Saya tidak menggunakan formulir ini untuk fitnah, ancaman, spam, atau ujaran kebencian.</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={processingConsent}
                  onCheckedChange={(value) => setProcessingConsent(value === true)}
                />
                <span>Saya setuju data laporan diproses untuk verifikasi dan tindak lanjut.</span>
              </label>
            </div>
          </div>

          <div>
            <Button type="button" variant="outline" size="sm" onClick={requestLocation} disabled={locationLoading}>
              <MapPin className="mr-2 h-4 w-4" />
              {locationLoading ? "Meminta izin lokasi..." : location ? "Lokasi terlampir" : "Sertakan lokasi (opsional)"}
            </Button>
            {locationMessage && <p className="mt-1 text-xs text-muted-foreground">{locationMessage}</p>}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={createComplaint.isPending}>
            <Send className="mr-2 h-4 w-4" />
            {createComplaint.isPending ? "Mengirim..." : "Kirim Aduan"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Menutup panel hanya memindahkannya ke tepi layar.
          </p>
        </form>
      )}
    </aside>
  );
}