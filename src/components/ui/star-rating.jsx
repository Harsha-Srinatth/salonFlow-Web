"use client";
import { cn } from "@/lib/utils";
import { animate } from "animejs";
import { Star } from "lucide-react";
import { useRef } from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

const SIZE_CLASSES = {
  sm: "size-4",
  md: "size-6",
  lg: "size-9",
};

/**
 * Interactive (or read-only) 1-5 star rating. Each star pops and glints when
 * selected — purely presentational, degrades to a static state on reduced motion.
 */
export function StarRating({ value = 0, onChange, readOnly = false, size = "md", className }) {
  const starRefs = useRef([]);

  function handleSelect(rating, index) {
    if (readOnly) return;
    onChange?.(rating);
    const el = starRefs.current[index];
    if (!el || prefersReducedMotion()) return;
    animate(el, {
      scale: [1, 1.45, 1],
      rotate: ["0deg", "-12deg", "0deg"],
      duration: 420,
      ease: "outElastic(1, .6)",
    });
  }

  return (
    <div className={cn("inline-flex items-center gap-1", className)} role={readOnly ? undefined : "radiogroup"} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((rating, index) => {
        const filled = rating <= Math.round(value);
        return (
          <button
            key={rating}
            ref={(el) => (starRefs.current[index] = el)}
            type="button"
            disabled={readOnly}
            aria-label={`${rating} star${rating > 1 ? "s" : ""}`}
            aria-pressed={filled}
            onClick={() => handleSelect(rating, index)}
            className={cn(
              "inline-flex origin-center items-center justify-center transition-colors",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95"
            )}
            style={{ transition: readOnly ? undefined : "transform 150ms ease" }}
          >
            <Star
              className={cn(
                SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
                filled ? "fill-accent text-accent" : "fill-transparent text-muted-foreground/40"
              )}
              strokeWidth={filled ? 1.5 : 1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
