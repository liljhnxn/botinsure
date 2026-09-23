import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/components/Web3Provider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";

export const metadata: Metadata = {
  title: "BotInsure | Decentralized Parametric Protection Protocol",
  description:
    "On-chain parametric protection protocol for the Botchain ecosystem. Real-time code-enforced underwriting, transparent pool reserves, and instant oracle-driven claim settlements.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-slate-100 antialiased selection:bg-botCyan/20 selection:text-botCyan">
        <Web3Provider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <BackButton />
            {children}
          </main>
          <Footer />
        </Web3Provider>
      </body>
    </html>
  );
}
