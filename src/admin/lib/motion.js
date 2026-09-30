"use client";
/**
 * Shared anime.js (v4) motion helpers for the admin portal.
 * Kept intentionally small and dependency-light: every helper degrades to a
 * no-op when the user prefers reduced motion, and none of them touch
 * component state/logic — purely presentational polish.
 */
import { animate, set as setProps, stagger } from "animejs";
import { useEffect, useRef } from "react";

export function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

/**
 * Fade + rise a container's direct children in with a stagger.
 * Call from a useEffect after data is ready; safe to call repeatedly.
 */
export function revealChildren(container, { selector = ":scope > *", delay = 0, distance = 14 } = {}) {
  if (!container || prefersReducedMotion()) return;
  const targets = container.querySelectorAll(selector);
  if (!targets.length) return;
  setProps(targets, { opacity: 0, translateY: distance });
  animate(targets, {
    opacity: [0, 1],
    translateY: [distance, 0],
    delay: stagger(45, { start: delay }),
    duration: 520,
    ease: "outQuart",
  });
}

/**
 * React hook: reveals the direct children of the returned ref whenever
 * `deps` changes (e.g. once data has loaded).
 */
export function useRevealOnReady(deps = [], options) {
  const ref = useRef(null);
  useEffect(() => {
    revealChildren(ref.current, options);
  }, deps);
  return ref;
}

/**
 * React hook: animates a numeric value counting up whenever it changes.
 * Returns a ref to place on the element whose textContent should update.
 */
export function useCountUp(value, { duration = 900, formatter } = {}) {
  const ref = useRef(null);
  const prev = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = Number.isFinite(Number(value)) ? Number(value) : 0;
    const format = formatter ?? ((n) => Math.round(n).toLocaleString());
    if (prefersReducedMotion()) {
      el.textContent = format(target);
      prev.current = target;
      return;
    }
    const from = { n: prev.current };
    animate(from, {
      n: target,
      duration,
      ease: "outExpo",
      onUpdate: () => {
        el.textContent = format(from.n);
      },
    });
    prev.current = target;
  }, [value, duration, formatter]);
  return ref;
}

/** One-shot entrance for a single element (icons, headers, etc). */
export function useEntrance({ delay = 0, distance = 10 } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    setProps(ref.current, { opacity: 0, translateY: distance });
    animate(ref.current, {
      opacity: [0, 1],
      translateY: [distance, 0],
      delay,
      duration: 480,
      ease: "outQuart",
    });
  }, [delay, distance]);
  return ref;
}

/** Gentle pulse used to draw attention to live/realtime indicators. */
export function pulseOnce(el) {
  if (!el || prefersReducedMotion()) return;
  animate(el, {
    scale: [1, 1.18, 1],
    duration: 420,
    ease: "outQuad",
  });
}

export { animate, stagger, setProps };
