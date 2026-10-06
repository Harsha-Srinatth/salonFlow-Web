import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./presets";

const COLORS = () => {
  const css = getComputedStyle(document.documentElement);
  return ["--primary", "--accent", "--gold", "--info", "--plum"].map((v) => `hsl(${css.getPropertyValue(v).trim()})`);
};

/**
 * Fire confetti from a point (0–1 viewport fractions) or from an element's centre.
 * canvas-confetti is loaded on first use, so it never weighs on the entry bundle.
 * No-op for reduced motion.
 * @param {{ origin?: {x:number,y:number}, element?: Element|null, particleCount?: number, spread?: number }} [opts]
 */
export async function fireConfetti({ origin, element, particleCount = 90, spread = 70, ...rest } = {}) {
  if (typeof window === "undefined" || prefersReducedMotion()) return;
  const { default: confetti } = await import("canvas-confetti");
  let o = origin ?? { x: 0.5, y: 0.6 };
  if (element) {
    const r = element.getBoundingClientRect();
    o = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
  }
  confetti({ particleCount, spread, origin: o, colors: COLORS(), startVelocity: 38, gravity: 1.1, ticks: 180, scalar: 0.9, disableForReducedMotion: true, zIndex: 85, ...rest });
}

/**
 * Declarative confetti: bursts each time `trigger` changes to a truthy new value.
 * Renders an invisible anchor; the burst starts from its position.
 */
export function ConfettiBurst({ trigger, particleCount, spread, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!trigger) return;
    void fireConfetti({ element: ref.current, particleCount, spread });
  }, [trigger, particleCount, spread]);
  return <span ref={ref} aria-hidden className={className ?? "pointer-events-none absolute left-1/2 top-1/2"} />;
}
