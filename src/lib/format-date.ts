// Formateo de fechas DETERMINISTA (SSR-safe).
// `toLocaleDateString()`/`toLocaleString()` sin argumentos usan el locale y la
// timezone del runtime → producen strings distintos en el servidor (Node, UTC)
// y en el cliente (navegador del usuario), lo que rompe la hidratación de React
// ("Hydration failed…") y muestra formatos inconsistentes.
//
// Fijando locale + timeZone explícitos el resultado es idéntico en todos lados.
// Contexto del servicio: Chile (America/Santiago).

const TZ = "America/Santiago";
const LOCALE = "es-CL";

/** Fecha corta determinista: dd-MM-aaaa. Devuelve "—" si la fecha es inválida. */
export function formatDate(input: string | number | Date | null | undefined): string {
  if (input == null || input === "") return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(LOCALE, { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Fecha + hora determinista. Devuelve "—" si la fecha es inválida. */
export function formatDateTime(input: string | number | Date | null | undefined): string {
  if (input == null || input === "") return "—";
  const d = new Date(input);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(LOCALE, {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
