import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "第 4 組專題協作",
  description: "小組分工、回報與協調",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <body className="min-h-dvh bg-surface text-ink antialiased">
        {/* 手機優先：內容最寬 480px，置中 */}
        <div className="mx-auto min-h-dvh max-w-[480px] bg-surface">{children}</div>
      </body>
    </html>
  );
}
