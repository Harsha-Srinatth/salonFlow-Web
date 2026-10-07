import { TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmSheet } from "@/components/kit";

/**
 * Unsaved-changes guard for forms. The app uses <BrowserRouter> (no data router), so
 * react-router's useBlocker isn't available. Instead this:
 *  - warns on tab close / reload (beforeunload), and
 *  - intercepts clicks on in-app links (sidebar, tab bar, ⌘K results render as <a href>) while
 *    `dirty`, asking in a ConfirmSheet before leaving.
 * Browser back/forward is not intercepted (documented limitation).
 * Returns the sheet to render once in the page.
 */
export function useUnsavedGuard(dirty, { title = "Leave without saving?", description = "Your changes will be lost." } = {}) {
  const navigate = useNavigate();
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const next = `${url.pathname}${url.search}${url.hash}`;
      if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
      event.preventDefault();
      event.stopPropagation();
      setTarget(next);
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const leave = useCallback(() => {
    const next = target;
    setTarget(null);
    if (next) navigate(next);
  }, [navigate, target]);

  return (
    <ConfirmSheet
      open={Boolean(target)}
      onOpenChange={(open) => !open && setTarget(null)}
      icon={TriangleAlert}
      title={title}
      description={description}
      confirmLabel="Leave"
      cancelLabel="Keep editing"
      onConfirm={leave}
    />
  );
}
