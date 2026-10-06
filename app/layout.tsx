import { GoogleTagManager } from "@/components/google-tag-manager";
import { getAppUrl } from "@/lib/env/server";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
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
    default: "DeuTime | Quem organiza também merece jogar",
    template: "%s | DeuTime",
  },
  description:
    "Organize seu racha com agenda, confirmações pelo link, divisão de times, súmula e campeonatos. Acompanhe cada jogo do convite ao pós-jogo com o DeuTime.",
  applicationName: "DeuTime",
  icons: {
    apple: {
      url: "/brand/icone-deutime-email-256.png",
      sizes: "256x256",
      type: "image/png",
    },
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DeuTime",
    title: "DeuTime | Quem organiza também merece jogar",
    description:
      "Agenda, confirmações, equipes e resultados no mesmo lugar. Mais clareza para cuidar do racha.",
    url: "https://deutime.app",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "DeuTime | Quem organiza também merece jogar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeuTime | Quem organiza também merece jogar",
    description:
      "Agenda, confirmações, equipes e resultados no mesmo lugar. Mais clareza para cuidar do racha.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="pt-BR">
      <head />
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        <GoogleTagManager nonce={nonce} />
        {children}
      </body>
    </html>
  );
}
