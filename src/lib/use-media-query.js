import { useSyncExternalStore } from "react";

/** Live `matchMedia` result; false during the first server/hydration pass. */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (notify) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
