import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useState } from "react";
import { prefersReducedMotion, spring } from "@/components/motion/presets";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const INTERACTIVE = "a, button, [role='button'], input, textarea, select, [data-cursor]";

/**
 * Soft accent halo that trails the mouse and swells over anything clickable. Desktop (fine pointer)
 * only, off for reduced motion. The native cursor stays visible, so nothing depends on the halo.
 * Writes motion values only: no React re-render per pointer move.
 */
export function LandingCustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const size = useMotionValue(1);
  const visible = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 700, damping: 45, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 700, damping: 45, mass: 0.4 });
  const scale = useSpring(size, spring.snappy);
  const opacity = useSpring(visible, { stiffness: 300, damping: 30 });

  useEffect(() => {
    const mq = window.matchMedia(FINE_POINTER);
    const update = () => setEnabled(mq.matches && !prefersReducedMotion());
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const move = (e) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      visible.set(1);
      size.set(e.target instanceof Element && e.target.closest(INTERACTIVE) ? 1.9 : 1);
    };
    const hide = () => visible.set(0);
    const press = () => size.set(0.8);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", press, { passive: true });
    document.documentElement.addEventListener("pointerleave", hide);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      document.documentElement.removeEventListener("pointerleave", hide);
    };
  }, [enabled, x, y, size, visible]);

  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-popover -mt-4 -ml-4 size-8 rounded-full border-2 border-portal/50 bg-portal/10"
      style={{ x: sx, y: sy, scale, opacity }}
    />
  );
}
