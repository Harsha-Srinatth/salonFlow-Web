import { motion } from "motion/react";
import { distance as D, spring } from "./presets";

const OFFSET = { up: { y: D.md }, down: { y: -D.md }, left: { x: D.md }, right: { x: -D.md }, none: {} };

/**
 * Fades (and nudges) its children in on mount.
 * @param {{ direction?: "up"|"down"|"left"|"right"|"none", delay?: number, as?: string, className?: string }} props
 */
export function FadeIn({ direction = "up", delay = 0, as = "div", className, children, ...rest }) {
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, ...OFFSET[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ ...spring.soft, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}
