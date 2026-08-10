import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/ClientProviders";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "NovaChain — Decentralized Research Infrastructure",
  description:
    "A Solana-powered platform for lab equipment booking, soulbound identity, and research publication via compressed NFTs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-[#080c14] text-slate-100 antialiased">
        <ClientProviders>
          <Navbar />
          <main className="pt-16 min-h-screen grid-pattern relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080c14] pointer-events-none" />
            <div className="relative z-10">{children}</div>
          </main>
        </ClientProviders>
      </body>
    </html>
  );
}
