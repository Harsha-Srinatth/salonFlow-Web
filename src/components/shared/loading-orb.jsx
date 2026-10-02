"use client";
import { ThinkingOrb } from "thinking-orbs";
import { cn } from "@/lib/utils";

/** Shared loading indicator: the thinking orb (state "solving") with a small caption underneath. */
export function LoadingOrb({ label = "Loading…", state = "solving", size = 64, fullScreen = false, compact = false, className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        fullScreen ? "min-h-screen bg-background p-6" : compact ? "min-h-40 py-6" : "min-h-[40vh] p-6",
        className,
      )}
    >
      <ThinkingOrb state={state} size={size} />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/** 20px orb for buttons and inline text. `theme` pins the ink: use "light" (dark dots) on bright buttons. */
export function InlineOrb({ theme = "auto", className }) {
  return <ThinkingOrb state="searching" size={20} theme={theme} className={cn("shrink-0", className)} />;
}
