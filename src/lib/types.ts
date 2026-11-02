export type PriceCondition =
  | "always"
  | "when_input_lte"
  | "when_input_gt"
  | "peak"
  | "offpeak";

export type DayType = "weekday" | "weekend" | "any";

export interface PriceRow {
  id: number;
  modelId: number;
  label: string;
  condition: PriceCondition;
  threshold: number | null;
  /** 1 milyon token başına dolar */
  input: number;
  /** 1 milyon token başına dolar */
  output: number;
  /** 1 milyon önbellek okuma token'ı başına dolar */
  cacheRead: number;
  position: number;
}

export interface Company {
  id: number;
  slug: string;
  name: string;
  logo: string;
  accent: string;
}

export interface ModelWithPrices {
  id: number;
  slug: string;
  name: string;
  route: string | null;
  company: Company;
  prices: PriceRow[];
}

export interface PeakWindow {
  id: number;
  dayType: DayType;
  startMin: number;
  endMin: number;
}

export interface Config {
  models: ModelWithPrices[];
  peakWindows: PeakWindow[];
}

export interface CalcInput {
  inputTokens: number;
  outputTokens: number;
  cachePercent: number;
  date: string; // YYYY-MM-DD, Türkiye saati
  time: string; // HH:mm, Türkiye saati
}

export interface CalcRow {
  modelId: number;
  modelName: string;
  route: string | null;
  companyName: string;
  logo: string;
  accent: string;
  priceLabel: string;
  condition: PriceCondition;
  inputPrice: number;
  outputPrice: number;
  cacheReadPrice: number;
  costInput: number;
  costOutput: number;
  costCache: number;
  total: number;
  isPeakRate: boolean;
}

export interface CalcResult {
  rows: CalcRow[];
  peakNow: boolean;
  inputTokens: number;
  outputTokens: number;
  cachePercent: number;
  peakWindows: PeakWindow[];
}
