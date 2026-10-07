import { createContext, useContext } from "react";

/** Set by `UserFrame` (the persistent customer shell). Null outside it, e.g. the auth fallback. */
export const UserFrameContext = createContext(null);
export const useUserFrame = () => useContext(UserFrameContext);

/** Opens the shared invite sheet from anywhere in the customer portal (no-op outside the frame). */
export function useInvite() {
  return useContext(UserFrameContext)?.openInvite ?? (() => {});
}
