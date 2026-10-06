import { motion, useScroll, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "./presets";

/** Thin reading-progress bar pinned to the top of the viewport (or of a `container` ref). */
export function ScrollProgress({ container, className }) {
  const { scrollYProgress } = useScroll(container ? { container } : undefined);
  const scaleX = useSpring(scrollYProgress, { ...spring.snappy, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none fixed inset-x-0 top-0 z-toast h-[3px] origin-left bg-gradient-to-r from-portal to-accent", className)}
      style={{ scaleX }}
    />
  );
}
