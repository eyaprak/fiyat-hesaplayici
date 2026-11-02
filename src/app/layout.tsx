import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Model Fiyat Hesaplayıcı",
  description:
    "Claude ve DeepSeek modellerinin token maliyetini Türkiye saatiyle, yoğun saat farklarıyla birlikte hesaplayın.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
