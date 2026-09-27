import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import Link from "next/link";
import { THEME_BOOT_SCRIPT, ThemePicker } from "@/components/ThemePicker";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "The CEO Voice",
  description: "Executive communication training for non-native English speakers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The boot script sets data-theme before React hydrates, so the attribute legitimately differs from the server HTML.
    <html lang="en" data-theme="light" className={`${inter.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans">
        <header className="border-b border-graphite-800/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-serif text-xl tracking-wide text-graphite-100">
              The CEO <span className="text-gold-500">Voice</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-graphite-400">
              <Link href="/interview" className="transition hover:text-gold-400">
                Interview Simulator
              </Link>
              <Link href="/stage" className="transition hover:text-gold-400">
                Speaking Stage
              </Link>
              <ThemePicker />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8 md:py-12">{children}</main>
      </body>
    </html>
  );
}
