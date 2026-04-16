import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { LiveRegion } from '@/components/LiveRegion';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'MTG TCG — Accessible Combat Demo',
  description:
    'Keyboard-first, screen-reader-first fan-made TCG portfolio demo. Next.js, Zustand, Framer Motion, Scryfall API.',
  authors: [{ name: 'Nicolas De Nigris' }],
  robots: { index: true, follow: true },
  openGraph: {
    title: 'MTG TCG — Accessible Combat Demo',
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
  return (
    <html lang="en">
      <body>
        {/* Skip link: visually hidden until focused — Tab surfaces it. */}
        <a href="#main" className="skip-link">Skip to main content</a>
        <ErrorBoundary>{children}</ErrorBoundary>
        <LiveRegion />
      </body>
    </html>
  );
}
