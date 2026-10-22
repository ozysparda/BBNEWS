# Auto-verifikasi Donasi QRIS (Berugak Donasi)

QRIS **statis** tidak pernah mengirim webhook ke merchant. Jadi donasi QRIS
biasanya harus dicek manual oleh admin. Fitur ini menutup celah itu dengan cara
**gratis penuh dan tanpa pihak ketiga**: server membaca mutasi masuk dari akun
**GoPay Merchant milikmu sendiri**, lalu mencocokkannya dengan transaksi donasi
yang masih `pending`.

> Website ini hanya pembukuan. Uang tetap mengalir: donatur -> akun GoPay
> Merchant (PJP) -> rekening bank kamu.

---

## Cara kerjanya

1. Admin login ke akun GoPay Merchant **satu kali** lewat OTP SMS (kode masuk ke
   HP merchant itu sendiri, tidak pernah lewat server kami).
2. Sesi login (access + refresh token) disimpan **terenkripsi (AES-256-GCM)** di
   database. Kuncinya ada di environment variable server, bukan di repo.
3. Server menarik feed mutasi QRIS dari GoBiz (merchant-analytics, dengan
   fallback ke journals).
4. Setiap transaksi donasi `pending` dicocokkan dengan baris mutasi:
   - nominal yang dicocokkan = **nominal yang dibayar** (amount + fee MDR),
   - mutasi harus terjadi **setelah** transaksi donasi dibuat,
   - satu baris mutasi hanya dipakai untuk **satu** transaksi (dedupe),
   - kandidat yang nyaris bersamaan -> dianggap **ambigu**, dibiarkan `pending`
     untuk diperiksa admin (lebih aman daripada salah verifikasi).
5. Transaksi yang cocok -> `status = verified`, `autoVerified = true`.

Ada **dua pemicu** (satu handler, dua pintu):

| Opsi | Cara kerja | Pemicu |
| --- | --- | --- |
| **1. Manual** | Tombol **"Cek Mutasi Sekarang"** di panel admin | Admin |
| **2. Otomatis** | `POST /api/internal/donations/verify/run` | Cron / worker (gratis) |

---

## Environment variable (set sendiri di Vercel)

| Nama | Wajib? | Keterangan |
| --- | --- | --- |
| `CRON_SECRET` | ya (untuk Opsi 2) | Secret random panjang. Dipakai sebagai header `x-cron-secret`. **Jangan** simpan di repo. |
| `GOPAY_ENCRYPTION_KEY` | disarankan | Kunci enkripsi sesi GoPay. Kalau tidak diset, memakai `JWT_SECRET` sebagai fallback. |
| `GOPAY_APP_VERSION` | opsional | Override versi aplikasi portal GoBiz, mis. `platform-v3.125.0-e1923971`. Berguna saat GoBiz memperbarui build. |

> Semua secret diset lewat dashboard Vercel (Environment Variables) atau
> `vercel env add`. **Jangan pernah** menulis secret ke file repo, commit, atau
> chat.

Contoh membuat `CRON_SECRET` yang acak:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Langkah pemasangan

1. **Deploy** aplikasi (build otomatis menjalankan `apply-donations-schema.mjs`,
   jadi dua tabel baru dibuat otomatis & idempoten).
2. Set env di Vercel: `CRON_SECRET` (+ `GOPAY_ENCRYPTION_KEY` bila ingin kunci
   enkripsi terpisah), lalu redeploy.
3. Buka panel admin -> **Donasi** -> **Verifikasi Otomatis**.
4. Masukkan nomor HP akun GoPay Merchant -> **Kirim OTP** -> masukkan kode OTP
   dari SMS -> **Verifikasi & Simpan Sesi**.
5. Pilih salah satu (atau keduanya) opsi di bawah.

---

## Opsi 1 - Verifikasi Manual (tanpa hosting apa pun)

Di halaman **/admin/donasi/verifikasi**, tekan **"Cek Mutasi Sekarang"**.
Server menarik mutasi, mencocokkan, dan langsung mengubah transaksi pending
menjadi verified. Riwayat tiap pemeriksaan tersimpan di tabel
`donation_verification_runs` dan ditampilkan di halaman yang sama.

---

## Opsi 2 - Verifikasi Otomatis (gratis)

### 2a. GitHub Actions cron (paling mudah, tanpa host)

Workflow sudah tersedia di `.github/workflows/donation-verify.yml` (cron tiap
5 menit).

1. Di repo GitHub: **Settings -> Secrets and variables -> Actions -> New
   repository secret**, nama `CRON_SECRET`, nilainya **sama** dengan env
   `CRON_SECRET` di Vercel.
2. Di panel admin, nyalakan toggle **Auto-verifikasi**.

Efeknya: setiap ≤5 menit mutasi diperiksa tanpa perlu admin menekan apa pun.

> Kuota GitHub Free untuk repo private: 2.000 menit/bulan. Cron 5 menit
> ≈ 288 eksekusi/hari, tiap eksekusi beberapa detik saja. Kalau kuota habis,
> ubah `schedule` jadi `"*/15 * * * *"`.

### 2b. Worker di host 24/7 (Oracle Cloud Always Free)

Kalau mau deteksi < 1 menit, jalankan worker di VM Oracle Always Free (2 VM
gratis) atau di laptop yang menyala terus.

```bash
export CRON_SECRET="..."        # sama dengan env di Vercel
export VERIFY_URL="https://berugaknews.com/api/internal/donations/verify/run"
export VERIFY_INTERVAL_SECONDS=10
node scripts/donation-verify-worker.mjs
```

Worker ini **hanya ticker**: tidak butuh database, tidak butuh kredensial GoPay,
hanya satu secret. Semua logika tetap di server aplikasi.

Contoh systemd unit (`/etc/systemd/system/donation-verify.service`):

```ini
[Unit]
Description=Auto-verifikasi donasi QRIS BBNEWS
After=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/bbnews
Environment=CRON_SECRET=xxxxxxxx
Environment=VERIFY_INTERVAL_SECONDS=10
ExecStart=/usr/bin/node scripts/donation-verify-worker.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## Endpoint

| Method | Path | Auth | Keterangan |
| --- | --- | --- | --- |
| `GET` | `/api/admin/donations/verify/status` | JWT admin | Status koneksi, auto toggle, jumlah pending |
| `POST` | `/api/admin/donations/verify/otp` | JWT admin | `{ phoneNumber }` -> kirim OTP |
| `POST` | `/api/admin/donations/verify/login` | JWT admin | `{ otp }` -> simpan sesi terenkripsi |
| `POST` | `/api/admin/donations/verify/logout` | JWT admin | Putuskan sesi |
| `POST` | `/api/admin/donations/verify/run` | JWT admin | **Opsi 1** - verifikasi manual |
| `GET` | `/api/admin/donations/verify/runs` | JWT admin | Riwayat pemeriksaan |
| `PUT` | `/api/admin/donations/verify/settings` | JWT admin | Nyalakan/matikan auto, atur rentang feed |
| `POST` | `/api/internal/donations/verify/run` | header `x-cron-secret` | **Opsi 2** - pemicu otomatis |

---

## Database (tabel baru)

- `donation_gopay_accounts` - baris tunggal (`id = 1`): nomor HP, merchant id,
  sesi terenkripsi, token OTP terenkripsi, toggle auto-verifikasi, rentang feed,
  waktu terakhir dicek.
- `donation_verification_runs` - riwayat tiap pemeriksaan: sumber
  (`manual`/`auto`), status, jumlah mutasi, jumlah terverifikasi, pending
  sebelum/sesudah, dan rincian (jsonb).

Dibuat otomatis oleh `lib/db/scripts/apply-donations-schema.mjs` saat build
Vercel (idempoten, additive-only).

---

## Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| "Belum terhubung ke akun GoPay Merchant" | Belum login OTP. Buka panel admin -> Verifikasi Otomatis -> Kirim OTP. |
| "Sesi GoPay kedaluwarsa" | Refresh token sudah tidak berlaku (biasanya setelah logout di aplikasi GoPay / pergantian perangkat). Login ulang dengan OTP. |
| Mutasi terbaca tapi tidak ada yang cocok | Cek nominal: GoBiz mengirim **sen**, kode mengonversi otomatis. Pastikan fee MDR global sesuai (`Pengaturan Donasi` -> biaya QRIS). |
| Transaksi `ambigu` | Ada dua mutasi dengan nominal sama dalam waktu berdekatan. Cek manual di aplikasi GoPay, lalu verifikasi manual di panel transaksi. |
| Worker 401 | `CRON_SECRET` di host tidak sama dengan di Vercel. |
| Worker 404 | `CRON_SECRET` belum diset di Vercel (endpoint otomatis dinonaktifkan). |
| Auto tidak jalan | Toggle "Auto-verifikasi" di panel admin masih mati, atau pemicunya (workflow/worker) belum aktif. |

---

## Catatan keamanan & risiko

- **Tidak ada pihak ketiga.** Kredensial hanya ada di server kamu (Vercel) dan
  database kamu. Kode OTP masuk ke HP merchant. Tidak ada layanan aggregator,
  tidak ada webhook ke server luar.
- **Secret tidak pernah masuk repo.** `CRON_SECRET` & `GOPAY_ENCRYPTION_KEY`
  diset lewat dashboard Vercel; repo hanya memuat kode.
- Endpoint GoBiz adalah **API privat** portal GoPay Merchant (bukan API publik
  resmi). Endpoint bisa berubah kapan saja - itu sebabnya ada override
  `GOPAY_APP_VERSION` dan fallback journals.
- Risiko ToS & suspend: penggunaan API privat bisa bertentangan dengan
  ketentuan GoPay. Fitur ini sengaja memakai akun merchant sendiri dan polling
  berfrekuensi rendah (5 menit / 10 detik), bukan request berfrekuensi tinggi.
- Transaksi yang ambigu **tidak pernah** diverifikasi paksa - lebih baik
  pending daripada salah verifikasi.
