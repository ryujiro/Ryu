import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "ゲーム時間追加",
  description: "保護者用のゲーム時間追加アプリ",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ゲーム時間追加", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f5f1e8" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body><ServiceWorkerRegistration />{children}</body></html>;
}
