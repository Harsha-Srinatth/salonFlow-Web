import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { haptic, spring } from "@/components/motion/presets";
import { BrandLoader } from "./brand-loader";

const THRESHOLD = 72;
const MAX = 120;

/**
 * Pull-to-refresh for touch screens (page scroll at the top). Rubber-band pull, the scissors loader
 * while `onRefresh` (async) runs, springs back after. Disables the browser's native pull-to-refresh
 * while mounted. Desktop and mouse users never see it — keep a visible refresh button too.
 * @param {{ onRefresh: ()=>Promise<any>, disabled?: boolean, children: React.ReactNode, className?: string }} props
 */
export function PullToRefresh({ onRefresh, disabled = false, children, className }) {
  const y = useMotionValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const [armed, setArmed] = useState(false);
  const start = useRef(null);
  const indicatorOpacity = useTransform(y, [0, 24, THRESHOLD], [0, 0.6, 1]);
  const rotate = useTransform(y, [0, THRESHOLD], [0, 180]);
  const busy = useRef(false);

  useEffect(() => {
    if (disabled) return undefined;
    const root = document.documentElement;
    const prev = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = "contain";
    const onStart = (e) => {
      if (busy.current || window.scrollY > 0 || e.touches.length !== 1) return;
      start.current = e.touches[0].clientY;
    };
    const onMove = (e) => {
      if (start.current == null || busy.current) return;
      const dy = e.touches[0].clientY - start.current;
      // The page started scrolling (or the finger went up): this gesture is a normal scroll, not a pull.
      // Forget it entirely so reaching the top mid-scroll can never offset the content.
      if (window.scrollY > 0 || dy <= 0) {
        if (window.scrollY > 0) start.current = null;
        if (y.get() !== 0) y.set(0);
        setArmed(false);
        return;
      }
      const pulled = Math.min(MAX, dy * 0.5);
      y.set(pulled);
      const nowArmed = pulled >= THRESHOLD;
      setArmed((was) => {
        if (nowArmed && !was) haptic("tap");
        return nowArmed;
      });
    };
    const onEnd = async () => {
      if (start.current == null) return;
      start.current = null;
      if (y.get() >= THRESHOLD && !busy.current) {
        busy.current = true;
        setRefreshing(true);
        animate(y, 56, spring.snappy);
        try {
          await onRefresh?.();
        } finally {
          busy.current = false;
          setRefreshing(false);
          setArmed(false);
          animate(y, 0, spring.soft);
        }
      } else {
        setArmed(false);
        animate(y, 0, spring.bouncy);
      }
    };
    // Safety net: never leave the content offset when idle (e.g. a touchend lost to a scroll takeover).
    const onScroll = () => {
      if (!busy.current && start.current == null && y.get() !== 0) y.set(0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      root.style.overscrollBehaviorY = prev;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [disabled, onRefresh, y]);

  return (
    <div className={cn("relative", className)}>
      <motion.div aria-hidden={!refreshing} style={{ opacity: indicatorOpacity, y: useTransform(y, (v) => v - 48) }} className="pointer-events-none absolute inset-x-0 top-0 z-raised flex justify-center">
        <span className="glass-strong grid size-11 place-items-center rounded-full">
          {refreshing ? (
            <BrandLoader size="sm" hideLabel label="Refreshing" />
          ) : (
            <motion.span style={{ rotate }} className={cn("grid", armed ? "text-portal" : "text-ink-neutral")}>
              <ArrowDown className="size-5" aria-hidden />
            </motion.span>
          )}
        </span>
      </motion.div>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
