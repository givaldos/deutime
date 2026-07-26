import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { getAppUrl } from "@/lib/env/server";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getAppUrl(),
  title: {
    default: "DeuTime — cansou de perguntar \"quem vai?\"",
    template: "%s | DeuTime",
  },
  description:
    "O DeuTime convoca a galera, cobra resposta, fecha o número e divide os times. Você só marca o jogo — e joga.",
  applicationName: "DeuTime",
  icons: {
    icon: "/brand/icone-app-deutime.svg",
    apple: "/brand/icone-app-deutime.svg",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DeuTime",
    title: "DeuTime — deu time, deu jogo",
    description:
      "O DeuTime convoca a galera, cobra resposta, fecha o número e divide os times. Você só marca o jogo — e joga.",
    url: "https://deutime.app",
  },
  twitter: {
    card: "summary",
    title: "DeuTime — deu time, deu jogo",
    description:
      "O DeuTime convoca a galera, cobra resposta, fecha o número e divide os times. Você só marca o jogo — e joga.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
