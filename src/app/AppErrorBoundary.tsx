import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Finora failed to render.", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <main className="page">
            <div className="page-intro">
              <h1>Finora could not display this page</h1>
              <p className="page-lede">
                Reload to try again. Stored financial records were not changed.
              </p>
              <button
                type="button"
                className="inline-action"
                onClick={() => {
                  window.location.reload();
                }}
              >
                Reload
              </button>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
