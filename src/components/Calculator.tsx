"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalcResult, CalcRow, PeakWindow } from "@/lib/types";
import {
  formatMinutes,
  formatMultiplier,
  formatPerMillion,
  formatTokens,
  formatUsd,
  nowInIstanbul,
} from "@/lib/format";

type Form = {
  inputTokens: string;
  outputTokens: string;
  cachePercent: string;
  date: string;
  time: string;
};

type Calculated = CalcResult & { date: string; time: string };

const LOGO_FALLBACK: Record<string, string> = {
  Anthropic: "A",
  DeepSeek: "D",
};

const WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const RULER = [0, 6, 12, 18, 24];
const DAY_MINUTES = 1440;

function Logo({ row }: { row: CalcRow }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="logo logo-fallback" style={{ color: row.accent }}>
        {LOGO_FALLBACK[row.companyName] ?? row.companyName.charAt(0)}
      </span>
    );
  }

  return (
    <span className="logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={row.logo} alt={`${row.companyName} logosu`} onError={() => setFailed(true)} />
    </span>
  );
}

/** Seçilen günün yoğun saat bantlarını ve hesaplanan saati 24 saatlik bir şeritte gösterir. */
function Tariff({ result }: { result: Calculated }) {
  const [year, month, day] = result.date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  const isWeekend = weekday === 0 || weekday === 6;
  const windows = result.peakWindows.filter(
    (w: PeakWindow) =>
      w.dayType === "any" || (w.dayType === "weekend" ? isWeekend : !isWeekend),
  );
  const [hour, minute] = result.time.split(":").map(Number);
  const at = ((hour * 60 + minute) / DAY_MINUTES) * 100;
  const ranges = windows.map((w) => `${formatMinutes(w.startMin)}–${formatMinutes(w.endMin)}`);

  return (
    <div className={`tariff ${result.peakNow ? "peak" : "offpeak"}`}>
      <div className="tariff-head">
        <span className="tariff-state">
          <span className="dot" aria-hidden="true" />
          {result.peakNow ? "Yoğun saat" : "Yoğun saat dışı"}
        </span>
        <span className="tariff-when">
          {WEEKDAYS[weekday]} {result.time}
        </span>
      </div>

      <div className="tariff-track" role="img" aria-label={`Yoğun saatler: ${ranges.join(", ") || "yok"}`}>
        {windows.map((w) => (
          <span
            key={w.id}
            className="tariff-band"
            style={{
              left: `${(w.startMin / DAY_MINUTES) * 100}%`,
              width: `${((w.endMin - w.startMin) / DAY_MINUTES) * 100}%`,
            }}
          />
        ))}
        <span className="tariff-mark" style={{ left: `${at}%` }} />
      </div>

      <div className="tariff-ruler" aria-hidden="true">
        {RULER.map((h) => (
          <span key={h}>{String(h).padStart(2, "0")}</span>
        ))}
      </div>

      <p className="tariff-note">
        DeepSeek API {result.peakNow ? "yoğun saat" : "indirimli"} tarifeyle hesaplandı
        <span>
          {ranges.length > 0
            ? `${isWeekend ? "Hafta sonu" : "Hafta içi"} yoğun saatler ${ranges.join(", ")}`
            : `${isWeekend ? "Hafta sonu" : "Bu gün"} yoğun saat yok`}
        </span>
      </p>
    </div>
  );
}

export default function Calculator() {
  const initial = useMemo(nowInIstanbul, []);
  const [form, setForm] = useState<Form>({
    inputTokens: "100000",
    outputTokens: "20000",
    cachePercent: "0",
    date: initial.date,
    time: initial.time,
  });
  const [result, setResult] = useState<Calculated | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (payload: Form) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputTokens: Number(payload.inputTokens || 0),
          outputTokens: Number(payload.outputTokens || 0),
          cachePercent: Number(payload.cachePercent || 0),
          date: payload.date,
          time: payload.time,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Hesaplama başarısız");
      setResult({ ...(data as CalcResult), date: payload.date, time: payload.time });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  // İlk açılışta varsayılan değerlerle bir sonuç göster.
  useEffect(() => {
    void run(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key: keyof Form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void run(form);
  };

  const setNow = () => {
    const now = nowInIstanbul();
    setForm((prev) => ({ ...prev, date: now.date, time: now.time }));
  };

  const cheapest = result?.rows[0]?.total ?? 0;
  const priciest = result?.rows[result.rows.length - 1]?.total ?? 0;
  const cacheFill = `${Math.min(100, Math.max(0, Number(form.cachePercent) || 0))}%`;

  return (
    <div className="layout">
      <section className="card form-card">
        <h2>Kullanım</h2>
        <p className="muted">Token sayılarını ve isteğin zamanını girin</p>

        <form onSubmit={onSubmit} className="form">
          <label className="field">
            <span>Giriş token sayısı</span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={form.inputTokens}
              onChange={update("inputTokens")}
            />
          </label>

          <label className="field">
            <span>Çıkış token sayısı</span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={form.outputTokens}
              onChange={update("outputTokens")}
            />
          </label>

          <div className="field">
            <span>Önbellekten gelen giriş oranı</span>
            <div className="range-row">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                aria-label="Önbellekten gelen giriş oranı"
                style={{ "--fill": cacheFill } as React.CSSProperties}
                value={form.cachePercent}
                onChange={update("cachePercent")}
              />
              <span className="range-number">
                <span aria-hidden="true">%</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  aria-label="Önbellek oranı, yüzde"
                  value={form.cachePercent}
                  onChange={update("cachePercent")}
                />
              </span>
            </div>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Tarih</span>
              <input type="date" value={form.date} onChange={update("date")} required />
            </label>

            <label className="field">
              <span>Saat (Türkiye)</span>
              <input type="time" value={form.time} onChange={update("time")} required />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Hesaplanıyor…" : "Maliyeti hesapla"}
            </button>
            <button type="button" className="secondary" onClick={setNow}>
              Şimdi
            </button>
          </div>

          {error && <p className="error">{error}</p>}
        </form>

        {result && <Tariff result={result} />}
      </section>

      <section className="card results-card">
        <div className="results-head">
          <div>
            <h2>Model maliyetleri</h2>
            <p className="muted">En ucuzdan en pahalıya sıralı</p>
          </div>
          {result && (
            <div className="summary">
              <span className="summary-label">Toplam token</span>
              <strong>{formatTokens(result.inputTokens + result.outputTokens)}</strong>
            </div>
          )}
        </div>

        <div className="results" role="table" aria-label="Model maliyetleri">
          <div className="results-row results-header" role="row">
            <span role="columnheader">Model</span>
            <span role="columnheader" className="num part">Giriş</span>
            <span role="columnheader" className="num part">Önbellek</span>
            <span role="columnheader" className="num part">Çıkış</span>
            <span role="columnheader" className="num">Toplam</span>
          </div>

          {result?.rows.map((row, index) => (
            <div
              key={`${row.modelId}-${row.priceLabel}`}
              role="row"
              className={`results-row${index === 0 ? " best" : ""}`}
            >
              <div role="cell" className="model-cell">
                <Logo row={row} />
                <div className="model-text">
                  <strong>
                    {row.modelName}
                    {row.route && <span className="route">{row.route}</span>}
                  </strong>
                  <span className="model-meta">
                    {row.companyName} · {row.priceLabel}
                  </span>
                  <span className="per-million">
                    giriş {formatPerMillion(row.inputPrice)} · çıkış{" "}
                    {formatPerMillion(row.outputPrice)} · önbellek{" "}
                    {formatPerMillion(row.cacheReadPrice)}
                  </span>
                </div>
              </div>
              <span role="cell" className="num part">{formatUsd(row.costInput)}</span>
              <span role="cell" className={`num part${row.costCache === 0 ? " zero" : ""}`}>
                {row.costCache === 0 ? "—" : formatUsd(row.costCache)}
              </span>
              <span role="cell" className="num part">{formatUsd(row.costOutput)}</span>
              <div role="cell" className="num total">
                <strong>{formatUsd(row.total)}</strong>
                <span className="multiplier">
                  {index === 0
                    ? "En ucuz"
                    : cheapest > 0
                      ? `en ucuzun ${formatMultiplier(row.total / cheapest)} katı`
                      : "—"}
                </span>
              </div>
              <span className="bar" aria-hidden="true">
                <span
                  className="bar-fill"
                  style={{ transform: `scaleX(${priciest > 0 ? row.total / priciest : 0})` }}
                />
              </span>
            </div>
          ))}

          {!result && (
            <div className="empty" role="row">
              <span role="cell">Hesaplama bekleniyor…</span>
            </div>
          )}
        </div>

        <div className="legend">
          <span>Giriş ve önbellek sütunları toplam giriş token&apos;ını paylaşır</span>
          <span>Birim fiyatlar 1M token başına dolar</span>
        </div>
      </section>
    </div>
  );
}
