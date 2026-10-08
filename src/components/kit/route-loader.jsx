import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLoader } from "./brand-loader";

/**
 * Suspense fallback for routes: a slim accent bar at the top straight away, and the BrandLoader
 * only if loading takes longer than `delay` ms (no flash on fast navigations).
 */
export function RouteLoader({ fullScreen = false, label = "Loading…", delay = 220, className }) {
  const [showLoader, setShowLoader] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) return undefined;
    const t = setTimeout(() => setShowLoader(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={cn("relative", fullScreen ? "min-h-dvh bg-background" : "min-h-[40vh]", className)}>
      <div aria-hidden className="fixed inset-x-0 top-0 z-toast h-[3px] overflow-hidden">
        <div className="h-full w-full origin-left bg-gradient-to-r from-transparent via-portal to-accent" style={{ animation: "kit-route-bar 1.2s var(--ease-emphasized) infinite" }} />
      </div>
      <div className={cn("grid place-items-center transition-opacity duration-300", fullScreen ? "min-h-dvh" : "min-h-[40vh]", showLoader ? "opacity-100" : "opacity-0")}>
        <BrandLoader label={label} size={fullScreen ? "lg" : "md"} />
      </div>
    </div>
  );
}
