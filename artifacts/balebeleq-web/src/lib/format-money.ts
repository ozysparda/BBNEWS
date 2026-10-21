const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const plainFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** Format angka menjadi Rupiah, contoh: Rp 1.500.000 */
export function formatRupiah(value: number | null | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Rp 0";
  return rupiahFormatter.format(amount);
}

/** Format angka tanpa simbol mata uang, contoh: 1.500.000 */
export function formatNumber(value: number | null | undefined): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0";
  return plainFormatter.format(amount);
}

/** Parse input nominal dari user (menghapus karakter non angka) */
export function parseNominal(value: string | number): number {
  const digits = String(value).replace(/[^0-9]/g, "");
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
