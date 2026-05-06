'use client';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@/lib/observability';
import styles from './ErrorBoundary.module.css';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
    // Best-effort: forward to Sentry when NEXT_PUBLIC_SENTRY_DSN is set.
    // Silent no-op otherwise — observability must never break recovery UX.
    reportError(error, { componentStack: info.componentStack });
  }

  // Clears the captured error and re-renders children. Useful when the
  // failure is transient (e.g. a render glitch from a stale ref) and a
  // full reload would throw away the user's match state.
  reset = (): void => this.setState({ error: null });

  override render() {
    if (this.state.error) {
      return (
        <div role="alert" className={styles.wrap}>
          <h2 className={styles.title}>Something broke.</h2>
          <p>The match crashed. Try recovering, or reload to start fresh.</p>
          <pre className={styles.detail}>{this.state.error.message}</pre>
          <div className={styles.actions}>
            <button onClick={this.reset} className={styles.button}>
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
