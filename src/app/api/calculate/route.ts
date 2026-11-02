import { NextResponse } from "next/server";
import { calculate } from "@/lib/calc";
import { getConfig } from "@/lib/repo";

export const dynamic = "force-dynamic";

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const inputTokens = toNumber(body.inputTokens);
  const outputTokens = toNumber(body.outputTokens);
  const cachePercent = toNumber(body.cachePercent);
  const date = String(body.date ?? "");
  const time = String(body.time ?? "");

  if (inputTokens < 0 || outputTokens < 0) {
    return NextResponse.json({ error: "Token sayıları negatif olamaz" }, { status: 400 });
  }
  if (cachePercent < 0 || cachePercent > 100) {
    return NextResponse.json({ error: "Önbellek oranı 0-100 arasında olmalı" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return NextResponse.json({ error: "Tarih veya saat geçersiz" }, { status: 400 });
  }

  const config = await getConfig();
  const result = calculate(config, {
    inputTokens,
    outputTokens,
    cachePercent,
    date,
    time,
  });

  return NextResponse.json(result);
}
