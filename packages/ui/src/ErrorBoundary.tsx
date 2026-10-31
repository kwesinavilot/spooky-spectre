import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Calm fallback so a crash never blanks a surface. Real edge states
 * (no key, rate limited, PDF not supported) are populated in later specs.
 */
interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Intentionally silent: never log document text or keys (FR-PRIV-04).
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4">
          <p className="font-display text-lg text-specter-text">Something went wrong</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 text-specter-pale-violet underline"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
