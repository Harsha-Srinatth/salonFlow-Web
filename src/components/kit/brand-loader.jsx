import { useLayoutEffect, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { cn } from "@/lib/utils";

// thinking-orbs ships tuned designs at 20, 32 and 64px; larger sizes reuse the 64px design.
const SIZES = { xs: 20, sm: 20, md: 32, lg: 64, xl: 64 };

/** Reads the element's computed text colour so the orb inherits `currentColor` (buttons, chips). */
function useCurrentColor() {
  const ref = useRef(null);
  const [color, setColor] = useState();
  useLayoutEffect(() => {
    if (!ref.current) return;
    // The orb accepts #hex or rgb(); opacity-modified colours (rgba/oklab/color()) fall back to its
    // own theme-aware grey.
    const m = getComputedStyle(ref.current).color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    setColor(m ? `rgb(${m[1]}, ${m[2]}, ${m[3]})` : "auto");
  }, []);
  return [ref, color];
}

/**
 * Small inline orb for buttons, toasts and status text. Takes the surrounding text colour, so it
 * reads on a primary button as well as on a card. `size` is accepted for older call sites.
 */
// eslint-disable-next-line no-unused-vars
export function BrandDots({ className, size }) {
  const [ref, color] = useCurrentColor();
  return (
    <span ref={ref} aria-hidden className={cn("inline-grid size-5 shrink-0 place-items-center", className)}>
      {color ? <ThinkingOrb state="searching" size={20} color={color === "auto" ? undefined : color} aria-hidden /> : null}
    </span>
  );
}

/**
 * The app's loader: the thinking orb with a short caption underneath.
 * `variant` is accepted for older call sites ("dots" renders the inline orb).
 * @param {{ variant?: string, size?: "xs"|"sm"|"md"|"lg"|"xl", label?: string, hideLabel?: boolean, fullScreen?: boolean, className?: string }} props
 */
export function BrandLoader({ variant, size = "lg", label = "Loading…", hideLabel = false, fullScreen = false, className }) {
  const px = SIZES[size] ?? SIZES.lg;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-2 text-center", fullScreen && "min-h-dvh bg-background p-6", className)}
    >
      {variant === "dots" ? <BrandDots className="text-primary" /> : <ThinkingOrb state="solving" size={px} aria-hidden />}
      {hideLabel ? <span className="sr-only">{label}</span> : <p className="text-xs text-muted-foreground">{label}</p>}
    </div>
  );
}
