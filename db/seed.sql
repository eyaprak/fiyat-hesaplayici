-- İlk açılışta yüklenecek varsayılan veriler.
-- Fiyatlar 1 milyon token başına dolar: giriş / çıkış / önbellekten okuma.

INSERT INTO companies (slug, name, logo, accent) VALUES
  ('anthropic', 'Anthropic', '/logos/anthropic.svg', '#D97757'),
  ('deepseek',  'DeepSeek',  '/logos/deepseek.svg',  '#4D6BFE')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO models (company_id, slug, name, route, position) VALUES
  ((SELECT id FROM companies WHERE slug = 'anthropic'), 'claude-opus-5-5',    'Claude Opus 5.5',   NULL,             1),
  ((SELECT id FROM companies WHERE slug = 'anthropic'), 'claude-sonnet-5-5',  'Claude Sonnet 5.5', NULL,             2),
  ((SELECT id FROM companies WHERE slug = 'anthropic'), 'claude-haiku-5-5',   'Claude Haiku 5.5',  NULL,             3),
  ((SELECT id FROM companies WHERE slug = 'deepseek'),  'deepseek-v4-1-flash-api',        'DeepSeek V4.1 Flash', 'DeepSeek API', 4),
  ((SELECT id FROM companies WHERE slug = 'deepseek'),  'deepseek-v4-1-flash-openrouter', 'DeepSeek V4.1 Flash', 'OpenRouter',   5)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO price_rows (model_id, label, condition, threshold, input_price, output_price, cache_read_price, position)
SELECT m.id, v.label, v.condition, v.threshold, v.input_price, v.output_price, v.cache_read_price, v.position
FROM (VALUES
  ('claude-opus-5-5',   'Standart',          'always',         NULL::BIGINT, 4.00, 20.00, 0.2000, 1),
  ('claude-sonnet-5-5', 'Standart',          'always',         NULL::BIGINT, 2.00, 10.00, 0.1000, 1),
  ('claude-haiku-5-5',  '100K token ve altı','when_input_lte', 100000,       0.10,  0.50, 0.0100, 1),
  ('claude-haiku-5-5',  '100K token üstü',   'when_input_gt',  100000,       0.50,  2.50, 0.0500, 2),
  ('deepseek-v4-1-flash-api',        'Yoğun saat',     'peak',    NULL::BIGINT, 0.30, 1.20, 0.0060, 1),
  ('deepseek-v4-1-flash-api',        'Yoğun saat dışı','offpeak', NULL::BIGINT, 0.15, 0.60, 0.0030, 2),
  ('deepseek-v4-1-flash-openrouter', 'Sabit fiyat',    'always',  NULL::BIGINT, 0.30, 1.20, 0.0060, 1)
) AS v(model_slug, label, condition, threshold, input_price, output_price, cache_read_price, position)
JOIN models m ON m.slug = v.model_slug
WHERE NOT EXISTS (
  SELECT 1 FROM price_rows p WHERE p.model_id = m.id
);

INSERT INTO peak_windows (day_type, start_min, end_min)
SELECT v.day_type, v.start_min, v.end_min
FROM (VALUES
  ('weekday', 240, 420),  -- 04:00 - 07:00
  ('weekday', 540, 780)   -- 09:00 - 13:00
) AS v(day_type, start_min, end_min)
WHERE NOT EXISTS (SELECT 1 FROM peak_windows);
