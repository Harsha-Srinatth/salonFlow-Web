import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Radio, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";
import { useOnlineStatus } from "@/components/kit/offline-banner";

const GRACE_MS = 3000;
const BACK_MS = 2200;

/**
 * Socket.IO connection state for the staff portals (reception + stylist).
 * Slides a glass pill down when live updates drop for more than a moment, and briefly says
 * "Live again" when they return. Stays hidden while the device is offline (PortalShell's
 * OfflineBanner covers that), so the two never stack.
 * @param {{ connected?: boolean, className?: string }} props
 */
export function StaffRealtimeBanner({ connected, className }) {
  const online = useOnlineStatus();
  const [lost, setLost] = useState(false);
  const [back, setBack] = useState(false);
  const wasLost = useRef(false);

  useEffect(() => {
    if (typeof connected !== "boolean") return undefined;
    if (!connected) {
      const t = setTimeout(() => {
        wasLost.current = true;
        setLost(true);
      }, GRACE_MS);
      return () => clearTimeout(t);
    }
    setLost(false);
    if (!wasLost.current) return undefined;
    wasLost.current = false;
    setBack(true);
    const t = setTimeout(() => setBack(false), BACK_MS);
    return () => clearTimeout(t);
  }, [connected]);

  const show = online && (lost || back);
  return (
    <div className={cn("pointer-events-none fixed inset-x-0 top-[calc(var(--topbar-h)+var(--safe-top)+0.5rem)] z-toast flex justify-center px-4", className)} aria-live="polite">
      <AnimatePresence>
        {show ? (
          <motion.div
            key={lost ? "lost" : "back"}
            initial={{ y: -40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={spring.bouncy}
            className="glass-strong pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
          >
            {lost ? <RefreshCw className="kit-motion-loop size-4 animate-[kit-spin_1.6s_linear_infinite] text-ink-warning" aria-hidden /> : <Radio className="size-4 text-ink-success" aria-hidden />}
            {lost ? "Reconnecting live updates…" : "Live again"}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact "Live" indicator for the top bar. Icon-only below sm, dot + label above.
 * @param {{ connected?: boolean, className?: string }} props
 */
export function StaffLivePill({ connected, className }) {
  const reduce = useReducedMotion();
  if (typeof connected !== "boolean") return null;
  const label = connected ? "Live updates on" : "Live updates paused";
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption font-semibold ring-1 ring-inset transition-colors",
        connected ? "bg-success/12 text-ink-success ring-success/25" : "bg-muted text-ink-neutral ring-border",
        className
      )}
    >
      <span className="relative grid size-2 place-items-center">
        {connected && !reduce ? <span aria-hidden className="kit-live-ping absolute inset-0 rounded-full bg-success opacity-60" /> : null}
        <span aria-hidden className={cn("relative size-2 rounded-full", connected ? "bg-success" : "bg-muted-foreground")} />
      </span>
      <span className="hidden sm:inline">{connected ? "Live" : "Paused"}</span>
    </span>
  );
}
