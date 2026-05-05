import { headers } from 'next/headers';
import Script from 'next/script';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LiveRegion } from '@/components/LiveRegion';
import { I18nProvider } from '@/i18n/I18nProvider';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'MTG TCG - Accessible Combat Demo',
  description:
    'Keyboard-first, screen-reader-first fan-made TCG portfolio demo. Next.js, Zustand, Framer Motion, Scryfall API.',
  authors: [{ name: 'Nicolas De Nigris' }],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'MTG TCG - Accessible Combat Demo',
    description: 'Accessible fan-made TCG demo built on the Scryfall API.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#0d1117',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Reading x-nonce here opts the route into dynamic rendering and
  // signals Next.js to propagate the nonce onto every framework
  // <script> it injects (chunk loader, RSC payload, hydration). The
  // <Script id="csp-nonce-anchor"> below carries the nonce explicitly
  // so 'strict-dynamic' has a trusted seed even on routes that
  // don't author their own scripts.
  const nonce = headers().get('x-nonce') ?? undefined;
  return (
    <html lang="en">
      <body>
        {nonce && (
          <Script
            id="csp-nonce-anchor"
            nonce={nonce}
            strategy="beforeInteractive"
          >{`/* csp nonce anchor */`}</Script>
        )}
        {/* Skip link: visually hidden until focused - Tab surfaces it. */}
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <I18nProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
          <LiveRegion />
        </I18nProvider>
      </body>
    </html>
  );
}
