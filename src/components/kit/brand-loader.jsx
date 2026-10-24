import { useLayoutEffect, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { cn } from "@/lib/utils";

// thinking-orbs ships hand-tuned 20px (inline) and 64px (page) designs; 32 is interpolated.
const SIZES = { xs: 20, sm: 20, md: 64, lg: 64, xl: 64 };

/**
 * Reads the element's computed text colour so a canvas orb can follow currentColor. Light ink means a
 * dark surface (orb theme "dark"), dark ink a light one; the orb shades toward the surface colour.
 */
function useCurrentColor(ref) {
  const [ink, setInk] = useState({});
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = getComputedStyle(el).color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    const color = m ? `rgb(${m[1]}, ${m[2]}, ${m[3]})` : undefined;
    const theme = m ? (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3] > 150 ? "dark" : "light") : undefined;
    setInk((prev) => (prev.color === color && prev.theme === theme ? prev : { color, theme }));
  });
  return ink;
}

/**
 * Small inline orb for buttons, toasts and text. Tinted with currentColor so it sits on any surface.
 * `size` is the legacy dot size (4–6); the orb is always the 20px inline design.
 */
export function BrandDots({ className, theme = "auto" }) {
  const ref = useRef(null);
  const ink = useCurrentColor(ref);
  return (
    <span ref={ref} aria-hidden className={cn("inline-flex shrink-0 items-center", className)}>
      <ThinkingOrb state="searching" size={20} theme={theme === "auto" ? (ink.theme ?? "auto") : theme} color={ink.color} aria-hidden />
    </span>
  );
}

/**
 * The branded loader: the thinking orb. Never use a plain spinner.
 * `variant` is kept for old call sites: "dots" renders the inline orb, anything else the page orb.
 * @param {{ variant?: "orb"|"dots", size?: "xs"|"sm"|"md"|"lg"|"xl", theme?: "auto"|"dark"|"light", label?: string, hideLabel?: boolean, fullScreen?: boolean, className?: string }} props
 */
export function BrandLoader({ variant = "orb", size = "md", theme = "auto", label = "Loading…", hideLabel = false, fullScreen = false, className }) {
  const px = SIZES[size] ?? SIZES.md;
  const visual =
    variant === "dots" ? <BrandDots className="text-portal" theme={theme} /> : <ThinkingOrb state={px === 20 ? "searching" : "solving"} size={px} theme={theme} aria-hidden />;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 text-center", fullScreen && "min-h-dvh bg-background p-6", className)}
    >
      {visual}
      {hideLabel ? <span className="sr-only">{label}</span> : <p className="text-caption font-medium text-ink-neutral">{label}</p>}
    </div>
  );
}
