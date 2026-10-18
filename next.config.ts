import type { NextConfig } from "next";
import { findPlaceholders } from "./content/event";

const placeholders = findPlaceholders();
if (placeholders.length > 0 && process.env.NODE_ENV === "production") {
  console.warn(`\n⚠  content/event.ts still has ${placeholders.length} placeholders:\n  ${placeholders.join("\n  ")}\n`);
}

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async redirects() {
    return [
      // Temporary while the site is only the invitation. Delete this entry
      // (and add app/page.tsx) when the full wedding homepage exists.
      { source: "/", destination: "/pozvanka", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // Private edit links are credentials: never leak them via Referer, never cache them.
        source: "/odpoved/:token",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
