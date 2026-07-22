import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const shareDisplay = Fraunces({
  subsets: ["latin"],
  variable: "--font-share-display",
  display: "swap",
});

const shareBody = Outfit({
  subsets: ["latin"],
  variable: "--font-share-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CS2 Inventory Tracker",
  description: "Local-first Counter-Strike 2 inventory and market value tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${shareDisplay.variable} ${shareBody.variable}`}>
      <body>
        <div className="min-h-screen">
          <SiteHeader />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
