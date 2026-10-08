/**
 * Motion language for the whole product. Every animated component imports from here so the
 * landing page and all four portals move the same way. CSS twins live in globals.css
 * (--ease-spring, --dur-*, --stagger-*). Table: src/DESIGN.md → "Motion presets".
 */
import { useReducedMotion } from "motion/react";

/**
 * Springs (motion/react `transition` objects). Tuned to settle in ~200–300ms with little or no
 * overshoot: motion confirms an action, it never makes anyone wait.
 */
export const spring = {
  /** Default for most UI: cards, chips, pills. */
  soft: { type: "spring", stiffness: 420, damping: 38, mass: 0.8 },
  /** Small elements reacting to input: toggles, selection highlights, tab pills. */
  snappy: { type: "spring", stiffness: 600, damping: 40, mass: 0.6 },
  /** Success icons and badges: a hint of pop, nothing more. */
  bouncy: { type: "spring", stiffness: 520, damping: 30, mass: 0.7 },
  /** Large surfaces: bottom sheets, dialogs. No visible wobble. */
  sheet: { type: "spring", stiffness: 480, damping: 44, mass: 0.9 },
  /** Kept for older call sites; same feel as `soft`. */
  gentle: { type: "spring", stiffness: 420, damping: 38, mass: 0.8 },
};

/** Cubic-bezier eases for tween animations (opacity fades, progress bars). Never linear for UI. */
export const ease = {
  out: [0.22, 1, 0.36, 1],
  outExpo: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
  emphasized: [0.2, 0, 0, 1],
  sheet: [0.32, 0.72, 0, 1],
};

/** Seconds. */
export const duration = { instant: 0.1, fast: 0.15, base: 0.2, slow: 0.28, hero: 0.4 };

/** Seconds between staggered children. */
export const stagger = { tight: 0.02, base: 0.03, loose: 0.05 };

/** Distances (px) for entrances. Small on purpose: motion should whisper. */
export const distance = { sm: 4, md: 8, lg: 16 };

/** Ready-made variants. Use with initial="hidden" animate="show" exit="exit". */
export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: distance.md },
    show: { opacity: 1, y: 0, transition: spring.soft },
    exit: { opacity: 0, y: -distance.sm, transition: { duration: duration.fast, ease: ease.out } },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: duration.base, ease: ease.out } },
    exit: { opacity: 0, transition: { duration: duration.fast, ease: ease.out } },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.94 },
    show: { opacity: 1, scale: 1, transition: spring.soft },
    exit: { opacity: 0, scale: 0.96, transition: { duration: duration.fast, ease: ease.out } },
  },
  slideRight: {
    hidden: { opacity: 0, x: -distance.md },
    show: { opacity: 1, x: 0, transition: spring.soft },
    exit: { opacity: 0, x: distance.sm, transition: { duration: duration.fast } },
  },
  /** Parent that staggers its children. */
  stagger: (gap = stagger.base, delayChildren = 0) => ({
    hidden: {},
    show: { transition: { staggerChildren: gap, delayChildren } },
    exit: { transition: { staggerChildren: gap / 2, staggerDirection: -1 } },
  }),
};

/** Fixed interaction presets (contract item g). */
export const interaction = {
  /** Card hover: lift 4px + lift shadow. */
  cardHover: { y: -2, transition: spring.soft },
  /** Press feedback for anything tappable. */
  press: { scale: 0.97, transition: spring.snappy },
  /** Page transitions in portal shells. */
  page: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: duration.fast, ease: ease.out } },
    exit: { opacity: 0, transition: { duration: duration.instant, ease: ease.out } },
  },
};

/** Haptic patterns (ms). Call through haptic() so unsupported devices are a no-op. */
export const haptics = { tap: 8, success: [12, 40, 18], error: [30, 50, 30], warning: 20, reward: [10, 30, 10, 30, 40] };

export function haptic(kind = "tap") {
  try {
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    if (prefersReducedMotion()) return;
    // Chrome blocks (and logs an error for) vibrate before the first user gesture, e.g. a toast on redirect.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate(haptics[kind] ?? haptics.tap);
  } catch {
    // Some browsers throw when vibrate is blocked by permissions policy.
  }
}

export function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

/**
 * Returns `full` normally and `reduced` (default: an instant opacity-only fade) when the user asks
 * for reduced motion. Use for transitions motion's MotionConfig can't simplify by itself.
 */
export function useMotionPreset(full, reduced = { duration: 0.01 }) {
  return useReducedMotion() ? reduced : full;
}
