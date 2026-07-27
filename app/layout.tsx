import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { getAppUrl } from "@/lib/env/server";
import "./globals.css";

const GOOGLE_TAG_MANAGER_ID = "GTM-TPJZMDD3";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');
          `}
        </Script>
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GOOGLE_TAG_MANAGER_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
