"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Config, DayType, PriceCondition, PriceRow } from "@/lib/types";
import { formatMinutes } from "@/lib/format";

const CONDITION_LABELS: Record<PriceCondition, string> = {
  always: "Her zaman",
  when_input_lte: "Giriş ≤ eşik",
  when_input_gt: "Giriş > eşik",
  peak: "Yoğun saat",
  offpeak: "Yoğun saat dışı",
};

const DAY_LABELS: Record<DayType, string> = {
  weekday: "Hafta içi",
  weekend: "Hafta sonu",
  any: "Her gün",
};

function minutesToInput(minutes: number) {
  return formatMinutes(minutes);
}

function parseMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export default function AdminPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/prices")
      .then((res) => res.json())
      .then(setConfig)
      .catch(() => setStatus({ kind: "error", text: "Fiyatlar yüklenemedi" }));
  }, []);

  const updatePrice = (modelId: number, priceId: number, patch: Partial<PriceRow>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        models: prev.models.map((model) =>
          model.id !== modelId
            ? model
            : {
                ...model,
                prices: model.prices.map((p) => (p.id === priceId ? { ...p, ...patch } : p)),
              },
        ),
      };
    });
  };

  const updateWindow = (id: number, patch: Partial<Config["peakWindows"][number]>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        peakWindows: prev.peakWindows.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      };
    });
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prices: config.models.flatMap((m) => m.prices),
          peakWindows: config.peakWindows,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Kayıt başarısız");
      setConfig(data as Config);
      setStatus({ kind: "ok", text: "Fiyatlar güncellendi." });
    } catch (error) {
      setStatus({
        kind: "error",
        text: error instanceof Error ? error.message : "Kayıt başarısız",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ₺
          </span>
          <div>
            <h1>Fiyat yönetimi</h1>
            <p>1 milyon token başına dolar cinsinden fiyatlar</p>
          </div>
        </div>
        <Link className="ghost-link" href="/">
          Hesaplayıcıya dön
        </Link>
      </header>

      {!config ? (
        <section className="card">
          <p className="muted">Yükleniyor…</p>
        </section>
      ) : (
        <section className="card">
          <h2>Modeller</h2>
          <p className="muted">
            Bir satırın koşulu &quot;her zaman&quot; ise diğer koşullar uygulanmaz.
          </p>

          <div className="admin-grid">
            {config.models.map((model) => (
              <div className="admin-model" key={model.id}>
                <h3>
                  {model.company.name} · {model.name}
                  {model.route && <span className="tag-chip">{model.route}</span>}
                </h3>

                {model.prices.map((price) => {
                  const needsThreshold =
                    price.condition === "when_input_lte" || price.condition === "when_input_gt";
                  return (
                    <div key={price.id}>
                      <div className="admin-row">
                        <label className="field">
                          <span>Etiket</span>
                          <input
                            value={price.label}
                            onChange={(e) =>
                              updatePrice(model.id, price.id, { label: e.target.value })
                            }
                          />
                        </label>

                        <label className="field">
                          <span>Koşul</span>
                          <select
                            value={price.condition}
                            onChange={(e) =>
                              updatePrice(model.id, price.id, {
                                condition: e.target.value as PriceCondition,
                              })
                            }
                          >
                            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="field">
                          <span>Giriş $/1M</span>
                          <input
                            type="number"
                            step="0.0001"
                            min={0}
                            value={price.input}
                            onChange={(e) =>
                              updatePrice(model.id, price.id, { input: Number(e.target.value) })
                            }
                          />
                        </label>

                        <label className="field">
                          <span>Çıkış $/1M</span>
                          <input
                            type="number"
                            step="0.0001"
                            min={0}
                            value={price.output}
                            onChange={(e) =>
                              updatePrice(model.id, price.id, { output: Number(e.target.value) })
                            }
                          />
                        </label>

                        <label className="field">
                          <span>Önbellek $/1M</span>
                          <input
                            type="number"
                            step="0.000001"
                            min={0}
                            value={price.cacheRead}
                            onChange={(e) =>
                              updatePrice(model.id, price.id, { cacheRead: Number(e.target.value) })
                            }
                          />
                        </label>

                        {needsThreshold && (
                          <label className="field">
                            <span>Eşik (token)</span>
                            <input
                              type="number"
                              step="1"
                              min={0}
                              value={price.threshold ?? 0}
                              onChange={(e) =>
                                updatePrice(model.id, price.id, {
                                  threshold: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <h2 style={{ marginTop: 28 }}>Yoğun saat aralıkları (Türkiye saati)</h2>
          <div className="admin-grid">
            {config.peakWindows.map((window) => (
              <div className="admin-row" key={window.id}>
                <label className="field">
                  <span>Gün</span>
                  <select
                    value={window.dayType}
                    onChange={(e) =>
                      updateWindow(window.id, { dayType: e.target.value as DayType })
                    }
                  >
                    {Object.entries(DAY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Başlangıç</span>
                  <input
                    type="time"
                    value={minutesToInput(window.startMin)}
                    onChange={(e) => updateWindow(window.id, { startMin: parseMinutes(e.target.value) })}
                  />
                </label>

                <label className="field">
                  <span>Bitiş</span>
                  <input
                    type="time"
                    value={minutesToInput(window.endMin)}
                    onChange={(e) => updateWindow(window.id, { endMin: parseMinutes(e.target.value) })}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="form-actions" style={{ marginTop: 22 }}>
            <button className="primary" onClick={save} disabled={saving}>
              {saving ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
            </button>
          </div>

          {status && (
            <div className={`notice ${status.kind === "error" ? "error-notice" : ""}`}>
              {status.text}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
