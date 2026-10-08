import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import { interaction, spring } from "./presets";

/**
 * Card that lifts on hover (the fixed card-hover preset) and presses on tap. `tilt` adds a subtle
 * 3D tilt that follows the pointer (fine pointers only, off for reduced motion).
 */
export function HoverLiftCard({ tilt = false, as = "div", className, children, ...rest }) {
  const Comp = motion[as] ?? motion.div;
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [5, -5]), spring.soft);
  const rotateY = useSpring(useTransform(px, [0, 1], [-6, 6]), spring.soft);
  const enableTilt = tilt && !reduce;

  return (
    <Comp
      className={cn("rounded-card bg-card shadow-soft transition-shadow duration-300 hover:shadow-lift", className)}
      whileHover={reduce ? undefined : interaction.cardHover}
      whileTap={reduce ? undefined : interaction.press}
      style={enableTilt ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      onPointerMove={
        enableTilt
          ? (e) => {
              if (e.pointerType !== "mouse") return;
              const r = e.currentTarget.getBoundingClientRect();
              px.set((e.clientX - r.left) / r.width);
              py.set((e.clientY - r.top) / r.height);
            }
          : undefined
      }
      onPointerLeave={
        enableTilt
          ? () => {
              px.set(0.5);
              py.set(0.5);
            }
          : undefined
      }
      {...rest}
    >
      {children}
    </Comp>
  );
}
