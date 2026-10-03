import { useEffect } from "react";

/** Marks <html> so the customer theme tokens (see globals.css) cover the page, dialogs and toasts. */
export function usePortalClass(name = "portal-customer") {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(name);
    return () => root.classList.remove(name);
  }, [name]);
}
