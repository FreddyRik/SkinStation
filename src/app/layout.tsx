import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Fraunces, Inter, JetBrains_Mono, Outfit } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { rootMetadata } from "@/lib/site";
import "./globals.css";

const uiSans = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
});

const dataMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  display: "swap",
});

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
  themeColor: "#0a0f1d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${uiSans.variable} ${dataMono.variable} ${shareDisplay.variable} ${shareBody.variable}`}
    >
      <body className={`${uiSans.className} overflow-x-hidden`}>
        <div className="flex min-h-screen min-w-0 flex-col">
          <SiteHeader />
          <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
          <SiteFooter />
        </div>
        <Analytics />
      </body>
    </html>
  );
}
