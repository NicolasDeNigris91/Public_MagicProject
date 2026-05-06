import { NextResponse, type NextRequest } from 'next/server';

/**
 * Per-request CSP nonce generator.
 *
 * Generates a 16-byte random nonce, base64-encodes it, and writes it
 * to the request header `x-nonce` so server components can read it
 * via `headers()` and pass it down to Next.js script tags. The same
 * nonce is appended to the response's `Content-Security-Policy`
 * header under `script-src`, so Next's own boot scripts and any
 * authored `<Script nonce={...}>` execute, but injected third-party
 * scripts without the nonce are blocked.
 *
 * `'strict-dynamic'` lets nonced scripts load further child scripts
 * (Next.js's chunk loader does this) without needing each chunk to
 * carry a nonce. style-src is now `'self'` only — the combat overlay
 * was the last consumer of inline `style=""` and now positions clones
 * via setProperty on CSS variables instead (see CombatLayer.tsx +
 * ADR 0005). Authored stylesheets are the only allowed style source.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self'",
    "img-src 'self' data: https://cards.scryfall.io https://c1.scryfall.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.scryfall.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Skip Next.js internals and static assets so the per-request
  // nonce isn't computed for chunk fetches (those load under the
  // page's CSP via 'strict-dynamic').
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
