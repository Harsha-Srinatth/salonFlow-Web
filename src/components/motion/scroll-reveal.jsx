import { motion } from "motion/react";
import { distance as D, spring } from "./presets";

/**
 * Reveals children the first time they scroll into view.
 * @param {{ y?: number, scale?: number, amount?: number, delay?: number, once?: boolean, as?: string }} props
 */
export function ScrollReveal({ y = D.lg, scale = 1, amount = 0.25, delay = 0, once = true, as = "div", className, children, ...rest }) {
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once, amount }}
      transition={{ ...spring.gentle, delay }}
      {...rest}
    >
      {children}
    </Comp>
  );
}
