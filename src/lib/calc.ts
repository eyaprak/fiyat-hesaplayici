import type {
  CalcInput,
  CalcRow,
  Config,
  PeakWindow,
  PriceRow,
} from "./types";

const MILLION = 1_000_000;

/** YYYY-MM-DD + HH:mm (Türkiye saati) -> haftanın günü (0=Pazar) ve gün içi dakika */
export function wallClock(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return { weekday, minutes: hour * 60 + minute, isWeekend: weekday === 0 || weekday === 6 };
}

export function isPeak(windows: PeakWindow[], date: string, time: string): boolean {
  const { weekday, minutes, isWeekend } = wallClock(date, time);
  return windows.some((w) => {
    const dayMatches =
      w.dayType === "any" ? true : w.dayType === "weekend" ? isWeekend : !isWeekend;
    if (!dayMatches) return false;
    // Başlangıç dahil, bitiş hariç.
    return minutes >= w.startMin && minutes < w.endMin;
  });
}

/** Aynı modelde birden fazla satır uyarsa en özel olanı seçer. */
function specificity(condition: PriceRow["condition"]): number {
  switch (condition) {
    case "when_input_lte":
    case "when_input_gt":
      return 3;
    case "peak":
    case "offpeak":
      return 2;
    default:
      return 1;
  }
}

function applies(
  price: PriceRow,
  inputTokens: number,
  peak: boolean,
): boolean {
  switch (price.condition) {
    case "when_input_lte":
      return inputTokens <= (price.threshold ?? 0);
    case "when_input_gt":
      return inputTokens > (price.threshold ?? 0);
    case "peak":
      return peak;
    case "offpeak":
      return !peak;
    case "always":
    default:
      return true;
  }
}

function pickPrice(
  prices: PriceRow[],
  inputTokens: number,
  peak: boolean,
): PriceRow | null {
  const candidates = prices.filter((p) => applies(p, inputTokens, peak));
  if (candidates.length === 0) return null;
  return candidates.sort(
    (a, b) =>
      specificity(b.condition) - specificity(a.condition) || a.position - b.position,
  )[0];
}

export function calculate(config: Config, input: CalcInput) {
  const peak = isPeak(config.peakWindows, input.date, input.time);
  const cachedTokens = (input.inputTokens * input.cachePercent) / 100;
  const freshInputTokens = input.inputTokens - cachedTokens;

  const rows: CalcRow[] = [];
  for (const model of config.models) {
    const price = pickPrice(model.prices, input.inputTokens, peak);
    if (!price) continue;

    const costInput = (freshInputTokens / MILLION) * price.input;
    const costOutput = (input.outputTokens / MILLION) * price.output;
    const costCache = (cachedTokens / MILLION) * price.cacheRead;

    rows.push({
      modelId: model.id,
      modelName: model.name,
      route: model.route,
      companyName: model.company.name,
      logo: model.company.logo,
      accent: model.company.accent,
      priceLabel: price.label,
      condition: price.condition,
      inputPrice: price.input,
      outputPrice: price.output,
      cacheReadPrice: price.cacheRead,
      costInput,
      costOutput,
      costCache,
      total: costInput + costOutput + costCache,
      isPeakRate: price.condition === "peak",
    });
  }

  rows.sort((a, b) => a.total - b.total);

  return {
    rows,
    peakNow: peak,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    cachePercent: input.cachePercent,
  };
}
