# Model Fiyat Hesaplayıcı

Claude ve DeepSeek modellerinin token maliyetini; giriş/çıkış token sayısı, önbellekten
gelen giriş oranı ve Türkiye saatine göre seçilen tarih/saat üzerinden hesaplar.
Sonuçlar en ucuzdan en pahalıya sıralanır.

## Çalıştırma

```bash
docker compose up --build
```

- Uygulama: http://localhost:3001
- Yönetim: http://localhost:3001/admin
- PostgreSQL: localhost:5433 (`postgres` / `postgres`, veritabanı `fiyat`)

Veritabanı ilk kez oluşturulurken `db/schema.sql` ve `db/seed.sql` otomatik çalışır.
Tohum verisini yeniden yüklemek için: `docker compose down -v && docker compose up --build`

## Fiyatlandırma mantığı

Fiyatlar 1 milyon token başına dolar olarak `price_rows` tablosunda tutulur. Her satırın
bir koşulu vardır:

| Koşul | Anlamı |
| --- | --- |
| `always` | Her zaman geçerli |
| `when_input_lte` | Giriş token sayısı eşiğe eşit veya altındaysa |
| `when_input_gt` | Giriş token sayısı eşiğin üstündeyse |
| `peak` | Seçilen zaman yoğun saat aralığındaysa |
| `offpeak` | Seçilen zaman yoğun saat dışındaysa |

Aynı modelde birden fazla satır uyarsa en özel koşul seçilir
(eşik > yoğun saat > her zaman).

Maliyet:

```
taze giriş   = giriş token × (1 − önbellek %)
önbellek     = giriş token × önbellek %
toplam       = taze giriş/1M × giriş fiyatı
             + önbellek/1M × önbellek okuma fiyatı
             + çıkış/1M × çıkış fiyatı
```

Yoğun saat aralıkları `peak_windows` tablosunda, Türkiye saatiyle (UTC+3) dakika cinsinden
tutulur. Varsayılan: hafta içi 04:00–07:00 ve 09:00–13:00; hafta sonu yoğun saat yok.

## Yapı

- `src/app/page.tsx` — hesaplayıcı
- `src/app/admin/page.tsx` — fiyat yönetimi
- `src/app/api/calculate` — hesaplama uç noktası
- `src/app/api/prices` — fiyat okuma/yazma
- `src/lib/calc.ts` — fiyat seçimi ve maliyet hesabı
- `db/` — şema ve tohum verisi
- `public/logos/` — Anthropic ve DeepSeek logoları (yerel dosya)
