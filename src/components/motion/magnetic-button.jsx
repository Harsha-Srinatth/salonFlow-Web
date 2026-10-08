import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { interaction, spring } from "./presets";

/**
 * Wrapper that gently pulls its child toward the cursor (desktop only) and presses on tap.
 * Wrap a Button or ButtonLoadingMorph. `strength` 0–1.
 */
export function MagneticButton({ strength = 0.35, className, children, ...rest }) {
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), spring.bouncy);
  const y = useSpring(useMotionValue(0), spring.bouncy);
  return (
    <motion.span
      className={cn("inline-flex", className)}
      style={reduce ? undefined : { x, y }}
      whileTap={reduce ? undefined : interaction.press}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      {...rest}
    >
      {children}
    </motion.span>
  );
}
