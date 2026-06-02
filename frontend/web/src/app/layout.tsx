import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Inter as the UI font, exposed as the --font-inter CSS variable that
// globals.css maps onto --font-sans (design tokens, slice 01).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "VendMe — Offline-resilient, multi-tenant POS",
  description:
    "VendMe is a multi-tenant POS + ERP platform: offline-first selling, real-time sync, and multi-branch management.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
