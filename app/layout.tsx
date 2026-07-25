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
    default: "DeuTime — deu time, deu jogo",
    template: "%s | DeuTime",
  },
  description:
    "Convocação, presença, agenda, súmula e estatísticas do seu time em um só lugar.",
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
      "Convocação, presença, agenda, súmula e estatísticas do seu time em um só lugar.",
    url: "https://deutime.app",
  },
  twitter: {
    card: "summary",
    title: "DeuTime — deu time, deu jogo",
    description:
      "Convocação, presença, agenda, súmula e estatísticas do seu time em um só lugar.",
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
