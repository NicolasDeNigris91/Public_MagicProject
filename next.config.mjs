import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */

// CSP is now ENFORCED via src/middleware.ts, which generates a
// per-request nonce so script-src no longer needs 'unsafe-inline'.
// The remaining security headers (sniff, frame, HSTS, etc.) stay
// here because they are static and do not vary per request.
//
// See ADR 0005 for the threat model and why style-src keeps
// 'unsafe-inline'.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
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

// Wrapping is a no-op unless ANALYZE=true; running `npm run analyze`
// sets the env and emits .next/analyze/{client,server,edge}.html.
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withAnalyzer(nextConfig);
