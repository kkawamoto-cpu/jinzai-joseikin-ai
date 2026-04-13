import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import NavigationProgress from "@/components/NavigationProgress";

export const metadata: Metadata = {
  title: "AI助成くん - 人材開発支援助成金申請プラットフォーム",
  description: "人材開発支援助成金の申請準備から研修設計まで一気通貫で支援するAIプラットフォーム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
