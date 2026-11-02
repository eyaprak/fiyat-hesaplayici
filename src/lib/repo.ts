import { pool } from "./db";
import type { Config, DayType, ModelWithPrices, PeakWindow, PriceCondition, PriceRow } from "./types";

const CONDITIONS: PriceCondition[] = [
  "always",
  "when_input_lte",
  "when_input_gt",
  "peak",
  "offpeak",
];

const DAY_TYPES: DayType[] = ["weekday", "weekend", "any"];

interface ModelRow {
  id: number;
  slug: string;
  name: string;
  route: string | null;
  company_id: number;
  company_slug: string;
  company_name: string;
  logo: string;
  accent: string;
}

interface PriceDbRow {
  id: number;
  model_id: number;
  label: string;
  condition: PriceCondition;
  threshold: string | null;
  input_price: string;
  output_price: string;
  cache_read_price: string;
  position: number;
}

export async function getConfig(): Promise<Config> {
  const [modelResult, priceResult, peakResult] = await Promise.all([
    pool.query<ModelRow>(`
      SELECT m.id, m.slug, m.name, m.route,
             c.id AS company_id, c.slug AS company_slug, c.name AS company_name,
             c.logo, c.accent
      FROM models m
      JOIN companies c ON c.id = m.company_id
      ORDER BY m.position, m.id
    `),
    pool.query<PriceDbRow>(`
      SELECT id, model_id, label, condition, threshold,
             input_price, output_price, cache_read_price, position
      FROM price_rows
      ORDER BY model_id, position, id
    `),
    pool.query<PeakWindow>(`
      SELECT id, day_type AS "dayType", start_min AS "startMin", end_min AS "endMin"
      FROM peak_windows
      ORDER BY start_min, id
    `),
  ]);

  const pricesByModel = new Map<number, PriceRow[]>();
  for (const p of priceResult.rows) {
    const list = pricesByModel.get(p.model_id) ?? [];
    list.push({
      id: p.id,
      modelId: p.model_id,
      label: p.label,
      condition: p.condition,
      threshold: p.threshold === null ? null : Number(p.threshold),
      input: Number(p.input_price),
      output: Number(p.output_price),
      cacheRead: Number(p.cache_read_price),
      position: p.position,
    });
    pricesByModel.set(p.model_id, list);
  }

  const models: ModelWithPrices[] = modelResult.rows.map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    route: m.route,
    company: {
      id: m.company_id,
      slug: m.company_slug,
      name: m.company_name,
      logo: m.logo,
      accent: m.accent,
    },
    prices: pricesByModel.get(m.id) ?? [],
  }));

  return { models, peakWindows: peakResult.rows };
}

export class ValidationError extends Error {}

function assertPrice(value: unknown, field: string): number {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  if (!Number.isFinite(n) || n < 0) throw new ValidationError(`${field} geçersiz`);
  return Math.round(n * 1_000_000) / 1_000_000;
}

/** Yönetim sayfasından gelen fiyat ve yoğun saat güncellemelerini tek işlemde yazar. */
export async function saveConfig(payload: unknown): Promise<void> {
  const body = payload as {
    prices?: unknown;
    peakWindows?: unknown;
  };
  if (!body || typeof body !== "object") throw new ValidationError("Gövde geçersiz");
  if (!Array.isArray(body.prices)) throw new ValidationError("prices dizisi gerekli");
  if (!Array.isArray(body.peakWindows)) throw new ValidationError("peakWindows dizisi gerekli");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const raw of body.prices as Record<string, unknown>[]) {
      const id = Number(raw.id);
      if (!Number.isInteger(id)) throw new ValidationError("Satır kimliği geçersiz");

      const label = String(raw.label ?? "").trim();
      if (!label) throw new ValidationError("Fiyat etiketi boş olamaz");

      const condition = String(raw.condition) as PriceCondition;
      if (!CONDITIONS.includes(condition)) throw new ValidationError("Koşul geçersiz");

      let threshold: number | null = null;
      if (condition === "when_input_lte" || condition === "when_input_gt") {
        threshold = Number(raw.threshold);
        if (!Number.isFinite(threshold) || threshold < 0)
          throw new ValidationError("Eşik değeri geçersiz");
        threshold = Math.round(threshold);
      }

      const input = assertPrice(raw.input, "Giriş fiyatı");
      const output = assertPrice(raw.output, "Çıkış fiyatı");
      const cacheRead = assertPrice(raw.cacheRead, "Önbellek okuma fiyatı");

      const result = await client.query(
        `UPDATE price_rows
         SET label = $1, condition = $2, threshold = $3,
             input_price = $4, output_price = $5, cache_read_price = $6
         WHERE id = $7`,
        [label, condition, threshold, input, output, cacheRead, id],
      );
      if (result.rowCount === 0) throw new ValidationError(`Satır bulunamadı: ${id}`);
    }

    for (const raw of body.peakWindows as Record<string, unknown>[]) {
      const id = Number(raw.id);
      const dayType = String(raw.dayType) as DayType;
      if (!DAY_TYPES.includes(dayType)) throw new ValidationError("Gün tipi geçersiz");

      const startMin = Number(raw.startMin);
      const endMin = Number(raw.endMin);
      if (
        !Number.isInteger(startMin) ||
        !Number.isInteger(endMin) ||
        startMin < 0 ||
        endMin > 1440 ||
        endMin <= startMin
      ) {
        throw new ValidationError("Yoğun saat aralığı geçersiz");
      }

      const result = await client.query(
        `UPDATE peak_windows SET day_type = $1, start_min = $2, end_min = $3 WHERE id = $4`,
        [dayType, startMin, endMin, id],
      );
      if (result.rowCount === 0) throw new ValidationError(`Aralık bulunamadı: ${id}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
