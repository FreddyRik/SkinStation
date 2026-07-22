import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import Link from "next/link";
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
          <header className="border-b border-[var(--border)]/80 bg-[var(--bg-elevated)]/70 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <Link href="/" className="group flex items-baseline gap-3">
                <span className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
                  Inventory<span className="text-[var(--accent)]">Tracker</span>
                </span>
                <span className="hidden text-xs uppercase tracking-[0.2em] text-[var(--text-muted)] sm:inline">
                  CS2
                </span>
              </Link>
              <nav className="flex items-center gap-3 text-sm">
                <Link
                  href="/"
                  className="text-[var(--text-muted)] transition hover:text-[var(--text)]"
                >
                  Home
                </Link>
                <span className="hidden text-[var(--text-muted)] sm:inline" aria-hidden>
                  ·
                </span>
                <p className="hidden text-xs text-[var(--text-muted)] sm:block sm:text-sm">
                  Local · Steam + Skinport
                </p>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
