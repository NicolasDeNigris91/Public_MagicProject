/** @type {import('next').NextConfig} */

// Content-Security-Policy in Report-Only mode while we phase out
// inline styles. Once components migrate to CSS modules / className
// only, drop `'unsafe-inline'` from style-src and flip the header
// name to the enforcing `Content-Security-Policy`.
//
// `script-src 'self' 'unsafe-inline'`: Next.js injects inline runtime
// scripts during hydration in dev and production. Switching to nonces
// is the next step and requires App Router's `headers()` to read the
// per-request nonce.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cards.scryfall.io https://c1.scryfall.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.scryfall.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cards.scryfall.io' },
      { protocol: 'https', hostname: 'c1.scryfall.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
