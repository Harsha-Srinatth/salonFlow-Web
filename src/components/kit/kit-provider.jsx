import { MotionConfig } from "motion/react";
import { KitToaster } from "./toaster";

/**
 * Mount once near the root (App.jsx). Makes every motion component honour prefers-reduced-motion
 * (transforms drop, fades stay) and mounts the single toaster.
 */
export function KitProvider({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <KitToaster />
    </MotionConfig>
  );
}
