import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { BrandLoader } from "./brand-loader";

/**
 * Suspense fallback for routes: blank for the first `delay` ms (fast navigations never flash a
 * loader), then the orb.
 */
export function RouteLoader({ fullScreen = false, label = "Loading…", delay = 200, className }) {
  const [showLoader, setShowLoader] = useState(delay === 0);
  useEffect(() => {
    if (delay === 0) return undefined;
    const t = setTimeout(() => setShowLoader(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={cn("grid place-items-center", fullScreen ? "min-h-dvh bg-background" : "min-h-[40vh]", className)}>
      {showLoader ? <BrandLoader label={label} /> : null}
    </div>
  );
}
