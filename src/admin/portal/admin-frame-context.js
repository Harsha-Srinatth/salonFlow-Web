import { createContext, useContext } from "react";

/**
 * The admin shell (sidebar, header) lives in one persistent route layout (`AdminFrame`) so it is not
 * torn down on every navigation: the sidebar keeps its scroll position and nothing flashes.
 * Pages describe themselves to the frame through this context:
 *  - setMeta({ title, description })  the header title/subtitle
 *  - slots.desktop / slots.mobile     DOM nodes in the header that a page's `actions` are portalled into
 * It is null outside the frame (e.g. the loading fallback), where AdminLayout renders a full shell itself.
 */
export const AdminFrameContext = createContext(null);

export function useAdminFrame() {
  return useContext(AdminFrameContext);
}
