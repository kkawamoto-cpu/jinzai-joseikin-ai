import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "人材開発支援助成金申請AI",
  description: "人材開発支援助成金の申請準備を支援するSaaSシステム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
