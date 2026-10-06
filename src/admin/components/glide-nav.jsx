"use client";
import { useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Hover "glide": one pill that travels between rows (any child marked `data-glide-row`) instead of
 * each row painting its own hover background. Ported from atom-v3's GlideNav: a single delegated
 * pointer handler and one moving element, so there are no React renders or per-frame measurements
 * while moving between rows. Disabled for touch (no hover) and respects reduced motion.
 */
export function GlideGroup({ children, className, ...props }) {
  const root = useRef(null);
  const pill = useRef(null);
  const last = useRef(null);

  const move = (target, immediate) => {
    const row = target.closest?.("[data-glide-row]");
    if (!row || !root.current?.contains(row) || !pill.current) return;
    const element = pill.current;
    if (row === last.current) {
      element.style.opacity = "1";
      return;
    }
    const box = row.getBoundingClientRect();
    const bounds = root.current.getBoundingClientRect();
    element.style.transitionDuration = immediate || !last.current ? "0ms" : "";
    element.style.width = `${box.width}px`;
    element.style.height = `${box.height}px`;
    element.style.transform = `translate(${box.left - bounds.left}px, ${box.top - bounds.top}px)`;
    element.style.opacity = "1";
    last.current = row;
  };
  const hide = () => {
    if (pill.current) pill.current.style.opacity = "0";
    last.current = null;
  };

  return (
    <div
      ref={root}
      className={cn("glide-group relative isolate", className)}
      onPointerOver={(event) => {
        if (event.pointerType !== "touch" && window.matchMedia("(hover: hover) and (pointer: fine)").matches) move(event.target, false);
      }}
      onFocus={(event) => move(event.target, true)}
      onPointerLeave={hide}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) hide();
      }}
      {...props}
    >
      <span ref={pill} aria-hidden className="glide-group__pill" />
      {children}
    </div>
  );
}
