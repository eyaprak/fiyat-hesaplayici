import Link from "next/link";
import Calculator from "@/components/Calculator";

export default function Page() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ₺
          </span>
          <div>
            <h1>Model Fiyat Hesaplayıcı</h1>
            <p>Token maliyetini model model, saat saat karşılaştırın</p>
          </div>
        </div>
        <Link className="ghost-link" href="/admin">
          Fiyatları yönet
        </Link>
      </header>

      <Calculator />

      <footer className="footer">
        Fiyatlar 1 milyon token başına ABD dolarıdır. Yoğun saatler Türkiye saatiyle
        (UTC+3) değerlendirilir.
      </footer>
    </main>
  );
}
