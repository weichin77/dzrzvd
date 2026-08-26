import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

const notoSans = Noto_Sans_TC({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "DZRZVD 杜戛地｜戶外機能服飾", template: "%s｜DZRZVD 杜戛地" },
  description: "杜戛地 DZRZVD 結合機能設計與平實價格，提供防風、防水、保暖、防曬與排汗戶外服飾。",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body className={notoSans.variable}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
