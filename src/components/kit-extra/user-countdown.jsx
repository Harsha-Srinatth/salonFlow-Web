import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";

function parts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Ticks once a second under an hour, every 30s otherwise (no wasted renders on far-off dates). */
function useNow(targetMs) {
  const [now, setNow] = useState(() => Date.now());
  const close = targetMs - now < 3600e3;
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), close ? 1000 : 30000);
    return () => clearInterval(t);
  }, [close]);
  return now;
}

function Unit({ value, label, reduce }) {
  const text = String(value).padStart(2, "0");
  return (
    <span className="flex flex-col items-center">
      <span className="relative grid h-[1.15em] overflow-hidden font-display font-bold tabular-nums leading-none">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            initial={reduce ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: "100%", opacity: 0 }}
            transition={spring.snappy}
            className="col-start-1 row-start-1"
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="mt-1 text-micro font-semibold uppercase opacity-75">{label}</span>
    </span>
  );
}

/**
 * Live countdown to an ISO instant with rolling digits (days/hours/min, plus seconds in the last
 * hour). Renders `doneLabel` once the time has passed.
 * @param {{ to: string, doneLabel?: string, className?: string }} props
 */
export function UserCountdown({ to, doneLabel = "Now", className }) {
  const reduce = useReducedMotion();
  const target = new Date(to).getTime();
  const now = useNow(target);
  if (!Number.isFinite(target)) return null;
  const left = target - now;
  if (left <= 0) return <span className={cn("font-display font-bold", className)}>{doneLabel}</span>;
  const p = parts(left);
  const units = p.d ? [[p.d, "days"], [p.h, "hrs"], [p.m, "min"]] : p.h ? [[p.h, "hrs"], [p.m, "min"]] : [[p.m, "min"], [p.s, "sec"]];
  const spoken = units.map(([v, l]) => `${v} ${l}`).join(" ");
  return (
    <span className={cn("inline-flex items-start gap-3", className)} role="timer" aria-label={`Starts in ${spoken}`}>
      {units.map(([v, l], i) => (
        <span key={l} className="flex items-start gap-3" aria-hidden>
          {i ? <span className="font-display font-bold leading-none opacity-40">:</span> : null}
          <Unit value={v} label={l} reduce={reduce} />
        </span>
      ))}
    </span>
  );
}
