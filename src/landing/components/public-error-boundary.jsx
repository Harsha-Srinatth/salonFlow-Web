import { Component, lazy, Suspense } from "react";

// The illustrated page is its own chunk (it would add ~50 KB gzip to the entry bundle). It is
// fetched once the browser is idle, so it is already in the module map if the network drops later.
const loadStatusPage = () => import("@/components/kit-extra/landing-status-page");
const LandingStatusPage = lazy(() => loadStatusPage().then((m) => ({ default: m.LandingStatusPage })));
if (typeof window !== "undefined") {
  const preload = () => loadStatusPage().catch(() => undefined);
  if ("requestIdleCallback" in window) window.requestIdleCallback(preload, { timeout: 8000 });
  else window.setTimeout(preload, 4000);
}

/** Plain, dependency-free last resort if even the status page chunk cannot load. */
function BareFallback({ offline }) {
  return (
    <main role="alert" className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-display-lg font-bold">{offline ? "You're offline" : "Something slipped"}</h1>
        <p className="mt-2 text-ink-neutral">{offline ? "Check your connection and try again." : "A quick reload usually fixes it."}</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-6 h-12 rounded-control bg-portal px-6 font-semibold text-portal-foreground">
          {offline ? "Try again" : "Reload"}
        </button>
      </div>
    </main>
  );
}

class FallbackGuard extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <BareFallback offline={this.props.offline} /> : this.props.children;
  }
}

/**
 * App-level safety net. Shows the illustrated offline page when the browser is offline (usually a
 * route chunk that could not be downloaded), the error page otherwise; both offer one action.
 * `resetKey` (the pathname) clears the error when the visitor navigates elsewhere.
 */
export class PublicErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error", error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return (
      <FallbackGuard offline={offline}>
        <Suspense fallback={null}>
          <LandingStatusPage kind={offline ? "offline" : "error"} />
        </Suspense>
      </FallbackGuard>
    );
  }
}
