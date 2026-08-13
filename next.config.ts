import type { NextConfig } from "next";

function privateDevOrigin(appUrl?: string) {
  if (!appUrl) return [];
  try {
    const url = new URL(appUrl);
    if (url.protocol !== "http:") return [];
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      /^10(?:\.\d{1,3}){3}$/.test(url.hostname) ||
      /^192\.168(?:\.\d{1,3}){2}$/.test(url.hostname) ||
      /^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/.test(url.hostname)
    ) {
      return [url.hostname];
    }
  } catch {
    // APP_URL inválida mantém o servidor de desenvolvimento fechado.
  }
  return [];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: privateDevOrigin(process.env.APP_URL),
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
};

export default nextConfig;
