import { motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { interaction } from "./presets";

/**
 * The one page transition (contract item g). Wrap a shell's content/<Outlet/>; it re-animates
 * whenever `transitionKey` (default: pathname) changes.
 *
 * Enter-only on purpose: the old `AnimatePresence mode="wait"` held the new page back until the
 * old one finished its exit, which made every sidebar tab switch feel ~200ms late. The new page
 * now mounts at once and fades in (opacity + 6px rise, compositor-only).
 */
export function PageTransition({ transitionKey, className, children }) {
  const { pathname } = useLocation();
  const key = transitionKey ?? pathname;
  return (
    <motion.div key={key} className={className} initial={interaction.page.initial} animate={interaction.page.animate}>
      {children}
    </motion.div>
  );
}
