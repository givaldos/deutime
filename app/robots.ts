import type { MetadataRoute } from "next";

/**
 * Crawlers não têm nada a fazer nas áreas autenticadas, nos links com token
 * (`/e`, `/c`, `/invite`) nem nas APIs. Páginas públicas por desenho
 * (`/`, `/p`, `/t`) permanecem permitidas; `/e` e `/c` já respondem `noindex`.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/p/", "/t/"],
        disallow: [
          "/api/",
          "/app/",
          "/auth/",
          "/c/",
          "/e/",
          "/invite/",
          "/me/",
        ],
      },
    ],
  };
}
