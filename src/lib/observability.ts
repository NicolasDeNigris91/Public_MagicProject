/**
 * Thin observability shim, feature-flagged behind
 * `NEXT_PUBLIC_SENTRY_DSN`.
 *
 * Without a DSN the module is a no-op: every public function returns
 * synchronously without doing any work, and the @sentry/browser chunk
 * is never loaded by the user's browser. With a DSN, the chunk is
 * lazily fetched and Sentry.init() runs once. Web Vitals are reported
 * as Sentry breadcrumbs so LCP / CLS / INP / FCP / TTFB show up next
 * to the surrounding error context.
 *
 * The DSN is read from `process.env.NEXT_PUBLIC_SENTRY_DSN`, which
 * Next.js inlines at build time. Flipping the flag is a redeploy, not
 * a runtime toggle — that's intentional: build-time gating lets the
 * bundler tree-shake the entire @sentry/browser chunk away when the
 * env var is absent.
 */

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
const ENV = process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV ?? 'production';

export const isObservabilityEnabled = (): boolean => Boolean(DSN);

type SentryModule = typeof import('@sentry/browser');

let sentryPromise: Promise<SentryModule | null> | null = null;
let initialized = false;

async function loadSentry(): Promise<SentryModule | null> {
  if (!DSN) return null;
  if (sentryPromise) return sentryPromise;
  sentryPromise = (async () => {
    // Dynamic import so the SDK lives in its own chunk that's only
    // fetched when the DSN is set at build time. With NEXT_PUBLIC_SENTRY_DSN
    // unset, the surrounding `if (!DSN) return null` short-circuit makes
    // the import statement unreachable from the user's perspective.
    const Sentry = await import('@sentry/browser');
    if (!initialized) {
      initialized = true;
      Sentry.init({
        dsn: DSN,
        environment: ENV,
        // Conservative defaults — tighten in a follow-up if the project
        // gets a real DSN and traffic to base sample rates on.
        tracesSampleRate: 0.1,
        // Avoid sending denial-of-service-ish noise from sandboxed
        // browser extensions that throw inside our pages.
        ignoreErrors: [/ResizeObserver loop/i, /Non-Error promise rejection captured/i],
      });
    }
    return Sentry;
  })();
  return sentryPromise;
}

/**
 * Report an error caught by an ErrorBoundary, an unhandled rejection,
 * or any other recoverable failure path. Best-effort: if Sentry can't
 * be loaded for any reason, we swallow the upload error rather than
 * letting an instrumentation failure mask the original bug.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  if (!DSN) return;
  void loadSentry()
    .then((Sentry) => {
      if (!Sentry) return;
      Sentry.withScope((scope) => {
        if (context) {
          for (const [k, v] of Object.entries(context)) scope.setExtra(k, v);
        }
        Sentry.captureException(error);
      });
    })
    .catch(() => {
      /* noop — instrumentation must not break the app */
    });
}

/**
 * Report a Web Vital sample as a Sentry breadcrumb so the metric
 * shows up alongside the next error event. Per-vital handlers fire
 * once each per page load (e.g. final CLS at unload), which is fine
 * since Sentry breadcrumbs are append-only.
 */
export interface VitalSample {
  name: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating?: 'good' | 'needs-improvement' | 'poor';
}

export function reportVital(sample: VitalSample): void {
  if (!DSN) return;
  void loadSentry()
    .then((Sentry) => {
      if (!Sentry) return;
      Sentry.addBreadcrumb({
        category: 'web-vital',
        level: sample.rating === 'poor' ? 'warning' : 'info',
        message: `${sample.name}=${sample.value}`,
        data: sample,
      });
    })
    .catch(() => undefined);
}

/**
 * Wire the global error/rejection listeners and start Web Vitals
 * collection. Idempotent — safe to call from a useEffect with empty
 * deps. Returns a teardown that detaches the listeners (handy for
 * tests, harmless in the production singleton).
 */
export function startObservability(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  if (!DSN) return () => undefined;

  const onError = (event: ErrorEvent) => {
    reportError(event.error ?? event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason, { kind: 'unhandledrejection' });
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  // Web Vitals: dynamic import to avoid pulling the (small) lib into
  // the entry chunk on builds that disable observability. Each helper
  // accepts a callback the package fires once with the final value.
  void import('web-vitals')
    .then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
      onCLS((m) => reportVital({ name: 'CLS', value: m.value, rating: m.rating }));
      onFCP((m) => reportVital({ name: 'FCP', value: m.value, rating: m.rating }));
      onINP((m) => reportVital({ name: 'INP', value: m.value, rating: m.rating }));
      onLCP((m) => reportVital({ name: 'LCP', value: m.value, rating: m.rating }));
      onTTFB((m) => reportVital({ name: 'TTFB', value: m.value, rating: m.rating }));
    })
    .catch(() => undefined);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
