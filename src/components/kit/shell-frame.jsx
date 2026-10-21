import { createContext, Suspense, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Outlet, useLocation } from "react-router-dom";
import { BrandLoader } from "./brand-loader";

const ShellFrameContext = createContext(null);

const META_KEYS = ["pageTitle", "pageSubtitle", "realtimeConnected", "hideFab"];
const sameMeta = (a, b) => META_KEYS.every((k) => a[k] === b[k]) && a.user?.id === b.user?.id && a.user?.name === b.user?.name;

/**
 * Turns a portal shell component (`Shell({ pageTitle, pageSubtitle, actions, realtimeConnected, user,
 * hideFab, children })`) into a persistent route layout plus a page wrapper, the same pattern as
 * AdminFrame/UserFrame:
 *  - `Frame` is mounted once as a parent <Route element>; it keeps the sidebar, header, notification
 *    bell and command palette alive across navigations instead of tearing them down per page.
 *  - `Layout` is what pages render. Inside the frame it only reports its meta and portals `actions`
 *    into the top bar; outside it (route loading fallback) it renders the full shell itself.
 */
export function createShellFrame(Shell) {
  function Frame() {
    const [meta, setMetaState] = useState({ pageTitle: "" });
    const [slot, setSlot] = useState(null);
    const { pathname } = useLocation();

    // The shell scrolls the document, so start each page at the top.
    useEffect(() => {
      window.scrollTo({ top: 0 });
    }, [pathname]);

    const value = useMemo(
      () => ({ setMeta: (next) => setMetaState((cur) => (sameMeta(cur, next) ? cur : next)), slot }),
      [slot]
    );

    return (
      <ShellFrameContext.Provider value={value}>
        <Shell {...meta} actions={<span ref={setSlot} className="flex items-center gap-1 empty:hidden" />}>
          <Suspense fallback={<BrandLoader className="py-24" label="Loading…" />}>
            <Outlet />
          </Suspense>
        </Shell>
      </ShellFrameContext.Provider>
    );
  }

  function Layout({ actions, children, ...meta }) {
    const frame = useContext(ShellFrameContext);
    const { pageTitle, pageSubtitle, realtimeConnected, hideFab, user } = meta;

    useLayoutEffect(() => {
      frame?.setMeta({ pageTitle, pageSubtitle, realtimeConnected, hideFab, user });
    }, [frame, pageTitle, pageSubtitle, realtimeConnected, hideFab, user]);

    if (!frame) {
      return (
        <Shell {...meta} actions={actions}>
          {children}
        </Shell>
      );
    }
    return (
      <>
        {actions && frame.slot ? createPortal(actions, frame.slot) : null}
        {children}
      </>
    );
  }

  return { Frame, Layout };
}
