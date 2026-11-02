/** Dolar tutarını Türkçe biçimde, tek ondalık düzeniyle yazar: $1.234,5678 */
export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  // 4 hane yetmeyen çok küçük tutarlar sıfır görünmesin.
  const digits = value > 0 && value < 0.0001 ? 6 : 4;
  const [whole, fraction] = value.toFixed(digits).split(".");
  const grouped = new Intl.NumberFormat("tr-TR").format(Number(whole));
  return `$${grouped},${fraction}`;
}

/** En ucuza göre kat: 2,7 */
export function formatMultiplier(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export function formatTokens(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("tr-TR").format(Math.round(value));
}

/** Birim fiyat: en az 2 ondalık, gereksiz sıfırlar atılır ($0,10, $0,003, $20,00) */
export function formatPerMillion(value: number): string {
  if (value >= 1) return `$${value.toFixed(2).replace(".", ",")}`;
  const [whole, fraction] = value.toFixed(4).split(".");
  return `$${whole},${fraction.replace(/0+$/, "").padEnd(2, "0")}`;
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
