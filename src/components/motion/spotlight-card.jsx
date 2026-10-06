import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Card with a soft radial spotlight that follows the pointer (desktop) and a glowing border.
 * Pure CSS variables, no re-renders. Touch devices see the static card.
 */
export function SpotlightCard({ as: Comp = "div", className, children, ...rest }) {
  const ref = useRef(null);
  return (
    <Comp
      ref={ref}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "group/spot relative isolate overflow-hidden rounded-card border border-border/70 bg-card shadow-soft",
        "before:pointer-events-none before:absolute before:inset-0 before:-z-[1] before:opacity-0 before:transition-opacity before:duration-300",
        "before:bg-[radial-gradient(420px_circle_at_var(--mx,50%)_var(--my,50%),hsl(var(--portal-accent)/0.14),transparent_60%)]",
        "hover:before:opacity-100",
        className
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}
