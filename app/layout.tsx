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
    default: "DeuTime — cansou de perguntar \"quem vai?\"",
    template: "%s | DeuTime",
  },
  description:
    "O DeuTime convoca a galera, cobra resposta, fecha o número e divide os times. Você só marca o jogo — e joga.",
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
    title: "DeuTime — deu time, deu jogo",
    description:
      "O DeuTime convoca a galera, cobra resposta, fecha o número e divide os times. Você só marca o jogo — e joga.",
    url: "https://deutime.app",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "DeuTime — deu time, deu jogo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeuTime — deu time, deu jogo",
    description:
      "O DeuTime convoca a galera, cobra resposta, fecha o número e divide os times. Você só marca o jogo — e joga.",
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
