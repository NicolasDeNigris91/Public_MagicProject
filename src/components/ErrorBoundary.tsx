'use client';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  override render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            maxWidth: 640, margin: '80px auto', padding: 24,
            border: '1px solid #b71c1c', borderRadius: 12, background: '#1a0a0a',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Something broke.</h2>
          <p>The match crashed. Refresh to start a new game.</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#ef9a9a' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: '10px 18px', background: '#b71c1c', color: '#fff', border: 0, borderRadius: 8, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
