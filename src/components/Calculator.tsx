"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalcResult, CalcRow } from "@/lib/types";
import { formatPerMillion, formatTokens, formatUsd, nowInIstanbul } from "@/lib/format";

type Form = {
  inputTokens: string;
  outputTokens: string;
  cachePercent: string;
  date: string;
  time: string;
};

const LOGO_FALLBACK: Record<string, string> = {
  Anthropic: "A",
  DeepSeek: "D",
};

function Logo({ row }: { row: CalcRow }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="logo logo-fallback" style={{ background: row.accent }}>
        {LOGO_FALLBACK[row.companyName] ?? row.companyName.charAt(0)}
      </span>
    );
  }

  return (
    <span className="logo" style={{ borderColor: `${row.accent}55` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={row.logo} alt={`${row.companyName} logosu`} onError={() => setFailed(true)} />
    </span>
  );
}

function startOfToday() {
  return nowInIstanbul();
}

export default function Calculator() {
  const initial = useMemo(startOfToday, []);
  const [form, setForm] = useState<Form>({
    inputTokens: "100000",
    outputTokens: "20000",
    cachePercent: "0",
    date: initial.date,
    time: initial.time,
  });
  const [result, setResult] = useState<CalcResult | null>(null);
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
      setResult(data as CalcResult);
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

  return (
    <div className="layout">
      <section className="card form-card">
        <h2>Kullanım bilgisi</h2>
        <p className="muted">Değerleri girin, maliyetler anında karşılaştırılsın.</p>

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

          <label className="field">
            <span>
              Önbellekten gelen giriş oranı
              <strong className="field-value">%{form.cachePercent || 0}</strong>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={form.cachePercent}
              onChange={update("cachePercent")}
            />
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              className="range-number"
              value={form.cachePercent}
              onChange={update("cachePercent")}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Tarih (Türkiye saati)</span>
              <input type="date" value={form.date} onChange={update("date")} required />
            </label>

            <label className="field">
              <span>Saat (Türkiye saati)</span>
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

        {result && (
          <div className={`peak-badge ${result.peakNow ? "peak" : "offpeak"}`}>
            <span className="dot" />
            {result.peakNow
              ? "Bu tarih ve saat yoğun saat aralığında — DeepSeek API fiyatı yoğun tarifeyle hesaplandı."
              : "Bu tarih ve saat yoğun saat dışında — DeepSeek API indirimli tarifeyle hesaplandı."}
          </div>
        )}
      </section>

      <section className="card results-card">
        <div className="results-head">
          <div>
            <h2>Model maliyetleri</h2>
            <p className="muted">En ucuzdan en pahalıya sıralı.</p>
          </div>
          {result && (
            <div className="summary">
              <span className="summary-label">Toplam token</span>
              <strong>
                {formatTokens(result.inputTokens + result.outputTokens)}
              </strong>
            </div>
          )}
        </div>

        <div className="table-wrap">
          <table className="results">
            <thead>
              <tr>
                <th>Model</th>
                <th className="num">Giriş</th>
                <th className="num">Önbellek</th>
                <th className="num">Çıkış</th>
                <th className="num total-col">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {result?.rows.map((row, index) => (
                <tr key={`${row.modelId}-${row.priceLabel}`} className={index === 0 ? "best" : ""}>
                  <td>
                    <div className="model-cell">
                      <Logo row={row} />
                      <div className="model-text">
                        <strong>
                          {row.modelName}
                          {row.route && <span className="route">{row.route}</span>}
                        </strong>
                        <span className="model-meta">
                          {row.companyName} · {row.priceLabel}
                          <span className="per-million">
                            {formatPerMillion(row.inputPrice)} / {formatPerMillion(row.outputPrice)}{" "}
                            / {formatPerMillion(row.cacheReadPrice)}
                          </span>
                        </span>
                      </div>
                      {index === 0 && <span className="cheapest-tag">En ucuz</span>}
                    </div>
                  </td>
                  <td className="num">{formatUsd(row.costInput)}</td>
                  <td className="num">{formatUsd(row.costCache)}</td>
                  <td className="num">{formatUsd(row.costOutput)}</td>
                  <td className="num total-col">
                    <div className="total-stack">
                      <strong>{formatUsd(row.total)}</strong>
                      {cheapest > 0 && index > 0 && (
                        <span className="multiplier">{row.total === 0 ? "—" : `${(row.total / cheapest).toFixed(1)}×`}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!result && (
                <tr>
                  <td colSpan={5} className="empty">
                    Hesaplama bekleniyor…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="legend">
          <span>Giriş ve önbellek sütunları toplam giriş token&apos;ını paylaşır.</span>
          <span>Fiyatlar 1M token başına dolar.</span>
        </div>
      </section>
    </div>
  );
}
