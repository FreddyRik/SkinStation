import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { rootMetadata } from "@/lib/site";
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

export const metadata: Metadata = rootMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${shareDisplay.variable} ${shareBody.variable}`}>
      <body className="overflow-x-hidden">
        <div className="flex min-h-screen min-w-0 flex-col">
          <SiteHeader />
          <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
          <SiteFooter />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
