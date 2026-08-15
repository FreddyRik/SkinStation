"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  name: string;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Isolates interactive islands so a Trade-Up or Share Card crash cannot take
 * down the rest of the page. Retry resets local state only.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`${this.props.name} crashed:`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="rounded-xl border border-[var(--danger)]/40 bg-[var(--bg-elevated)]/40 p-6 text-center"
          role="alert"
        >
          <p className="text-sm font-medium">{this.props.name} hit an error.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            You can retry this section without reloading the whole page.
          </p>
          <button
            type="button"
            className="mt-3 rounded-lg border border-[var(--accent)]/40 px-3 py-1.5 text-sm text-[var(--accent)] transition hover:bg-[var(--accent)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
