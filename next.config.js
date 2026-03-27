/** @type {import('next').NextConfig} */

// Build CSP header — fonts served locally via next/font, no external font CDN needed
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.supabase.co https://images.unsplash.com;
  font-src 'self';
  connect-src 'self'
    https://*.supabase.co
    wss://*.supabase.co
    https://wlsctflwfihasyvwheaa.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
`.replace(/\n/g, " ").trim();

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",        value: "on" },
  { key: "X-Frame-Options",               value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options",        value: "nosniff" },
  { key: "Referrer-Policy",               value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",            value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy",       value: ContentSecurityPolicy },
];

const nextConfig = {
  // ── Security headers on every route ──────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // ── Image optimisation ────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // ── Compress RSC payloads ─────────────────────────────────────────────────
  compress: true,

  // ── Suppress noisy dev logging ────────────────────────────────────────────
  logging: {
    fetches: { fullUrl: false },
  },
};

module.exports = nextConfig;
