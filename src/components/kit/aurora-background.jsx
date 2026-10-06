import { lazy, Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/components/motion/presets";

const AuroraGL = lazy(() => import("./aurora-gl"));

function canUseWebGL() {
  if (typeof window === "undefined" || prefersReducedMotion()) return false;
  const nav = navigator;
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 8) < 4 || (nav.deviceMemory ?? 8) < 4) return false;
  try {
    return Boolean(document.createElement("canvas").getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Gradient-mesh backdrop. Default is pure CSS (cheap everywhere). `webgl` upgrades to a lazy OGL
 * shader (landing hero only) on capable devices; low-power, save-data and reduced-motion users keep
 * the CSS version. Place inside a `relative` parent; it fills it.
 * @param {{ webgl?: boolean, animated?: boolean, grain?: boolean, className?: string }} props
 */
export function AuroraBackground({ webgl = false, animated = true, grain = true, className }) {
  const [gl, setGl] = useState(false);
  useEffect(() => {
    if (webgl) setGl(canUseWebGL());
  }, [webgl]);
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-[1] overflow-hidden", grain && "grain", className)}>
      <div className={cn("aurora absolute inset-0", animated && "aurora-animated")} />
      {gl ? (
        <Suspense fallback={null}>
          <AuroraGL className="absolute inset-0 size-full opacity-70" />
        </Suspense>
      ) : null}
    </div>
  );
}
