import { motion } from "motion/react";
import { stagger as S, variants } from "./presets";

/**
 * Staggers the entrance of its <StaggerItem> children. `inView` waits until it scrolls into view.
 * @param {{ gap?: number, delay?: number, inView?: boolean, as?: string, className?: string }} props
 */
export function Stagger({ gap = S.base, delay = 0, inView = false, as = "div", className, children, ...rest }) {
  const Comp = motion[as] ?? motion.div;
  const trigger = inView ? { whileInView: "show", viewport: { once: true, amount: 0.2 } } : { animate: "show" };
  return (
    <Comp className={className} variants={variants.stagger(gap, delay)} initial="hidden" {...trigger} {...rest}>
      {children}
    </Comp>
  );
}

/** One staggered child. `variant` picks an entrance from presets.variants. */
export function StaggerItem({ variant = "fadeUp", as = "div", className, children, ...rest }) {
  const Comp = motion[as] ?? motion.div;
  return (
    <Comp className={className} variants={variants[variant] ?? variants.fadeUp} {...rest}>
      {children}
    </Comp>
  );
}
