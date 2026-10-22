/**
 * Bangun URL API absolut untuk panggilan yang tidak memakai generated client
 * (misal endpoint upload bukti transfer yang butuh token upload khusus).
 *
 * - Kalau `VITE_API_URL` diset (API terpisah), prefix itu dipakai.
 * - Selain itu API dilayani pada origin yang sama di path `/api`.
 */
export function apiUrl(path: string): string {
  const external = import.meta.env.VITE_API_URL;
  const base = (external || import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
