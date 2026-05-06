import { NextRequest } from 'next/server';
import { describe, it, expect } from 'vitest';
import { COLORS, MANA_SYMBOL_URL } from '@/engine/color';
import { middleware } from './middleware';

/**
 * The middleware composes the per-request CSP at runtime. It's the
 * one place where authored hosts (Scryfall image CDN, Scryfall API,
 * SVG host for mana symbols) have to be enumerated correctly — a
 * missing host shows up as a broken image or a blocked fetch in the
 * browser, which axe + visual regression don't catch.
 *
 * Pin the host coverage by deriving expected hosts from the same
 * constants the app uses (MANA_SYMBOL_URL, the scryfall.client
 * BASE_URL) and asserting each one lands in the right CSP directive.
 */
function getCsp(): string {
  const req = new NextRequest('https://example.test/');
  const res = middleware(req);
  return res.headers.get('Content-Security-Policy') ?? '';
}

function getDirective(csp: string, name: string): string {
  const directive = csp.split(';').find((d) => d.trim().startsWith(`${name} `));
  return (directive ?? '').trim();
}

describe('middleware CSP', () => {
  it('issues a unique nonce per request', () => {
    const a = getCsp();
    const b = getCsp();
    expect(a).not.toBe(b);
    // Both should declare a nonce value.
    expect(a).toMatch(/'nonce-[^']+'/);
    expect(b).toMatch(/'nonce-[^']+'/);
  });

  it("script-src includes 'self', a per-request nonce, and 'strict-dynamic'", () => {
    const csp = getCsp();
    const scriptSrc = getDirective(csp, 'script-src');
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(scriptSrc).toContain("'strict-dynamic'");
  });

  it("style-src is locked to 'self' only — no 'unsafe-inline'", () => {
    const csp = getCsp();
    const styleSrc = getDirective(csp, 'style-src');
    expect(styleSrc).toBe("style-src 'self'");
    expect(styleSrc).not.toContain('unsafe-inline');
  });

  it('img-src allows every host the app actually loads images from', () => {
    const csp = getCsp();
    const imgSrc = getDirective(csp, 'img-src');

    // Every host in MANA_SYMBOL_URL must be allowlisted, otherwise
    // the color-picker mana glyphs render as broken-image icons.
    // This was the symptom of the 2026-05-06 manual-QA report.
    const manaHosts = new Set(COLORS.map((c) => new URL(MANA_SYMBOL_URL[c]).origin));
    for (const host of manaHosts) {
      expect(imgSrc, `img-src is missing ${host} (used by MANA_SYMBOL_URL)`).toContain(host);
    }

    // The two card-image hosts referenced by the Scryfall adapter
    // (cards.scryfall.io for current art, c1.scryfall.com for legacy
    // CDN paths). data: stays for the SVG inline base64 fallbacks.
    expect(imgSrc).toContain('https://cards.scryfall.io');
    expect(imgSrc).toContain('https://c1.scryfall.com');
    expect(imgSrc).toContain('data:');
    expect(imgSrc).toContain("'self'");
  });

  it('connect-src allows the Scryfall API origin', () => {
    const csp = getCsp();
    const connectSrc = getDirective(csp, 'connect-src');
    // scryfall.client.ts hits api.scryfall.com for /cards/search and
    // /cards/named.
    expect(connectSrc).toContain('https://api.scryfall.com');
    expect(connectSrc).toContain("'self'");
  });

  it('frame-ancestors is none and object-src is none (defense-in-depth)', () => {
    const csp = getCsp();
    expect(getDirective(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(getDirective(csp, 'object-src')).toBe("object-src 'none'");
  });

  it('upgrade-insecure-requests is set so http subresources auto-promote', () => {
    const csp = getCsp();
    expect(csp).toContain('upgrade-insecure-requests');
  });
});
