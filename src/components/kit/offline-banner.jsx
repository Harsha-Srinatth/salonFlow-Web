import { AnimatePresence, motion } from "motion/react";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";

const subscribe = (cb) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

/** Live navigator.onLine. */
export function useOnlineStatus() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

/**
 * Glass pill that slides down when the connection drops and briefly says "Back online" when it
 * returns. Mount once per shell (PortalShell already does). `forceOffline` is for the design lab.
 */
export function OfflineBanner({ forceOffline, className }) {
  const online = useOnlineStatus() && !forceOffline;
  const [showBack, setShowBack] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  useEffect(() => {
    if (!online) setWasOffline(true);
    else if (wasOffline) {
      setShowBack(true);
      const t = setTimeout(() => {
        setShowBack(false);
        setWasOffline(false);
      }, 2400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [online, wasOffline]);
  const visible = !online || showBack;
  return (
    <div className={cn("pointer-events-none fixed inset-x-0 top-[calc(0.75rem+var(--safe-top))] z-toast flex justify-center px-4", className)} aria-live="polite">
      <AnimatePresence>
        {visible ? (
          <motion.div
            key={online ? "on" : "off"}
            initial={{ y: -40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={spring.bouncy}
            className="glass-strong pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
          >
            {online ? <Wifi className="size-4 text-ink-success" aria-hidden /> : <WifiOff className="size-4 text-ink-warning" aria-hidden />}
            {online ? "Back online" : "You're offline"}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
