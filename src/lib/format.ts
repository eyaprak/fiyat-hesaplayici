/** Dolar tutarını Türkçe biçimde yazar: $1.234,5678 */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "$0,00";
  const digits = value >= 1 ? 4 : value >= 0.01 ? 6 : 8;
  const [whole, fraction] = value.toFixed(digits).split(".");
  const grouped = new Intl.NumberFormat("tr-TR").format(Number(whole));
  return `$${grouped},${fraction}`;
}

export function formatTokens(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("tr-TR").format(Math.round(value));
}

export function formatPerMillion(value: number): string {
  const fixed = value >= 1 ? value.toFixed(2) : value.toFixed(value >= 0.01 ? 3 : 4);
  return `$${fixed.replace(".", ",")}`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function nowInIstanbul(): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`,
  };
}
