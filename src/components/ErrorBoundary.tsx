import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Catches render errors so a bug shows a recoverable message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Bastion Proposal Generator crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid h-full place-items-center p-6">
        <div className="max-w-lg rounded-panel border border-rule bg-paper-raised p-6">
          <p className="text-[16px] font-semibold text-ink">Something went wrong on this screen.</p>
          <p className="mt-1 text-[13.5px] text-ink-secondary">Your proposals are saved. Reload to continue; if it keeps happening, reset the demo data from the profile menu.</p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-control bg-paper-inset p-3 font-mono text-[11.5px] text-ink-tertiary">{String(this.state.error.stack ?? this.state.error.message)}</pre>
          <button onClick={() => location.reload()} className="mt-4 rounded-control bg-rampart px-4 py-2 text-[13.5px] font-semibold text-white">
            Reload
          </button>
        </div>
      </div>
    );
  }
}
