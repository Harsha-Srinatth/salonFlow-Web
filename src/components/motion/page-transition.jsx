import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { interaction } from "./presets";

/**
 * The one page transition (contract item g). Wrap a shell's content/<Outlet/>; it re-animates
 * whenever `transitionKey` (default: pathname) changes. Opacity + 12px rise, sheet spring.
 */
export function PageTransition({ transitionKey, className, children }) {
  const { pathname } = useLocation();
  const key = transitionKey ?? pathname;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={key} className={className} {...interaction.page}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
