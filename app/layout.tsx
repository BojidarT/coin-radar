import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coin Radar · Solana research",
  description: "Live Solana market signals, explainable research, watchlist alerts and Phantom token links.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
