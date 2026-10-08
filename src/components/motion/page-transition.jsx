import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { prefersReducedMotion } from "./presets";

/**
 * Page transition for portal shells: a 150ms opacity fade when `transitionKey` (default: pathname)
 * changes. It never remounts or delays its children; the new page renders immediately and is
 * interactive during the fade. (An exit-then-enter AnimatePresence here used to mount every page
 * twice and hold each navigation for ~500ms.)
 */
export function PageTransition({ transitionKey, className, children }) {
  const { pathname } = useLocation();
  const key = transitionKey ?? pathname;
  const ref = useRef(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (prefersReducedMotion() || !ref.current?.animate) return;
    ref.current.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
  }, [key]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
