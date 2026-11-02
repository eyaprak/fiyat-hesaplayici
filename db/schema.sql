-- Model Fiyat Hesaplayıcı şeması
CREATE TABLE IF NOT EXISTS companies (
  id       SERIAL PRIMARY KEY,
  slug     TEXT NOT NULL UNIQUE,
  name     TEXT NOT NULL,
  logo     TEXT NOT NULL,
  accent   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
  id         SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  route      TEXT,
  position   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS price_rows (
  id               SERIAL PRIMARY KEY,
  model_id         INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  label            TEXT NOT NULL,
  condition        TEXT NOT NULL DEFAULT 'always'
                     CHECK (condition IN ('always', 'when_input_lte', 'when_input_gt', 'peak', 'offpeak')),
  threshold        BIGINT,
  input_price      NUMERIC(14,6) NOT NULL,
  output_price     NUMERIC(14,6) NOT NULL,
  cache_read_price NUMERIC(14,6) NOT NULL,
  position         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS peak_windows (
  id         SERIAL PRIMARY KEY,
  day_type   TEXT NOT NULL CHECK (day_type IN ('weekday', 'weekend', 'any')),
  start_min  INTEGER NOT NULL CHECK (start_min >= 0 AND start_min < 1440),
  end_min    INTEGER NOT NULL CHECK (end_min > 0 AND end_min <= 1440),
  CONSTRAINT peak_window_order CHECK (end_min > start_min)
);

CREATE INDEX IF NOT EXISTS price_rows_model_idx ON price_rows (model_id);
