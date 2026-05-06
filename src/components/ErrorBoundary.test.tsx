import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // ErrorBoundary calls console.error in componentDidCatch, AND React
  // logs the captured error itself. Silence both for clean test output.
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  consoleErrorSpy.mockRestore();
});

function Boom({ message = 'kaboom' }: { message?: string }): JSX.Element {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  it('renders children unchanged when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <p>healthy child</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('healthy child')).toBeInTheDocument();
  });

  it('catches an error and renders the fallback with role=alert + the error message', () => {
    render(
      <ErrorBoundary>
        <Boom message="the kraken broke loose" />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toMatch(/the kraken broke loose/);
    // Both recovery buttons are present.
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('"Try again" clears the captured error so children can render again', async () => {
    // The child throws on first render; after Try again resets state,
    // the child may still throw on re-render — but for THIS test we
    // need a child that toggles. Use an outer wrapper that swaps
    // children once the boundary resets to verify the reset path.
    let phase: 'broken' | 'fixed' = 'broken';
    function Toggleable() {
      if (phase === 'broken') throw new Error('still broken');
      return <p>recovered child</p>;
    }
    render(
      <ErrorBoundary>
        <Toggleable />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    phase = 'fixed';
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('recovered child')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('logs the captured error via console.error (componentDidCatch hook)', () => {
    render(
      <ErrorBoundary>
        <Boom message="logged-please" />
      </ErrorBoundary>,
    );
    // At least one console.error call carried our boundary's tag.
    const sawBoundaryLog = consoleErrorSpy.mock.calls.some((args) =>
      args.some((arg) => typeof arg === 'string' && arg.includes('[ErrorBoundary]')),
    );
    expect(sawBoundaryLog).toBe(true);
  });
});
