/**
 * Landing-only heavy motion libraries, loaded on demand so they never reach the entry bundle
 * or the portals. Call from an effect; both resolve to null for reduced motion.
 */
import { prefersReducedMotion } from "./presets";

/** GSAP with ScrollTrigger registered. */
export async function loadGsap() {
  if (prefersReducedMotion()) return null;
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}

/** Lenis smooth scrolling. Returns a stop() function. */
export async function startSmoothScroll(options = {}) {
  if (prefersReducedMotion()) return () => {};
  const { default: Lenis } = await import("lenis");
  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, ...options });
  let frame = 0;
  const raf = (time) => {
    lenis.raf(time);
    frame = requestAnimationFrame(raf);
  };
  frame = requestAnimationFrame(raf);
  return () => {
    cancelAnimationFrame(frame);
    lenis.destroy();
  };
}
