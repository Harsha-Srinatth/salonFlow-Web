import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Check, Info, LayoutGrid, Moon, Sun, Sunrise, Sunset, GanttChart } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { salonHour, salonTimeLabel } from "@/lib/salon-date";
import { haptic, spring } from "@/components/motion/presets";
import { SkeletonSlots } from "@/components/motion/skeleton-shimmer";

const GROUPS = [
  { key: "morning", label: "Morning", icon: Sunrise, test: (h) => h < 12 },
  { key: "afternoon", label: "Afternoon", icon: Sun, test: (h) => h >= 12 && h < 17 },
  { key: "evening", label: "Evening", icon: Sunset, test: (h) => h >= 17 && h < 21 },
  { key: "night", label: "Night", icon: Moon, test: (h) => h >= 21 },
];
const DEFAULT_REASON = { busy: "Fully booked", unavailable: "Not available" };
const isOff = (s) => s.availability === "busy" || s.availability === "unavailable";

/**
 * THE time picker (contract item b). Props-driven: give it slots, it never fetches.
 * Slot shape: { startsAt: ISO, availability?: "free"|"limited"|"busy"|"unavailable", reason?: string, seatsLeft?: number }
 * (the booking API's `{ startsAt }` objects work as-is — they render as "free").
 * Grouped Morning/Afternoon/Evening, morphing selection pill, "filling fast" pulse on limited slots,
 * tap an unavailable slot to see why. Optional visual timeline mode.
 * @param {{ slots: object[], value?: string, onChange: (startsAt:string, slot:object)=>void, loading?: boolean,
 *   mode?: "grid"|"timeline", allowModeToggle?: boolean, empty?: React.ReactNode, className?: string }} props
 */
export function TimeSlotPicker({ slots = [], value, onChange, loading = false, mode: modeProp = "grid", allowModeToggle = true, empty, className }) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState(modeProp);
  const [explain, setExplain] = useState(null);
  const groupId = useId();
  useEffect(() => setMode(modeProp), [modeProp]);
  useEffect(() => {
    if (!explain) return undefined;
    const t = setTimeout(() => setExplain(null), 3200);
    return () => clearTimeout(t);
  }, [explain]);

  const groups = useMemo(() => {
    const out = GROUPS.map((g) => ({ ...g, items: [] }));
    for (const slot of slots) {
      const h = salonHour(slot.startsAt);
      (out.find((g) => g.test(h)) ?? out[0]).items.push(slot);
    }
    return out.filter((g) => g.items.length);
  }, [slots]);

  if (loading && !slots.length) return <SkeletonSlots className={className} />;
  if (!slots.length) return empty ?? null;

  const pick = (slot) => {
    if (isOff(slot)) {
      haptic("warning");
      setExplain({ startsAt: slot.startsAt, reason: slot.reason ?? DEFAULT_REASON[slot.availability] });
      return;
    }
    haptic("tap");
    setExplain(null);
    onChange?.(slot.startsAt, slot);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {allowModeToggle ? (
        <div className="flex justify-end">
          <div role="radiogroup" aria-label="Slot view" className="inline-flex rounded-full bg-muted p-1">
            {[
              ["grid", LayoutGrid, "Grid"],
              ["timeline", GanttChart, "Timeline"],
            ].map(([m, Icon, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => setMode(m)}
                className={cn("relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-caption font-semibold", mode === m ? "text-foreground" : "text-ink-neutral")}
              >
                {mode === m ? <motion.span layoutId={`${groupId}-mode`} className="absolute inset-0 rounded-full bg-card shadow-soft" transition={spring.snappy} /> : null}
                <Icon className="relative size-3.5" aria-hidden />
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <LayoutGroup id={groupId}>
        {mode === "timeline" ? (
          <Timeline slots={slots} value={value} onPick={pick} reduce={reduce} groupId={groupId} />
        ) : (
          groups.map(({ key, label, icon: Icon, items }) => {
            const free = items.filter((s) => !isOff(s)).length;
            return (
              <section key={key} aria-label={label}>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Icon className="size-4 text-portal" aria-hidden />
                  {label}
                  <span className="text-caption font-normal text-ink-neutral">· {free} open</span>
                </p>
                <div role="radiogroup" aria-label={`${label} times`} className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {items.map((slot, i) => (
                    <SlotChip key={slot.startsAt} slot={slot} index={i} selected={value === slot.startsAt} onPick={pick} reduce={reduce} groupId={groupId} />
                  ))}
                </div>
                <AnimatePresence>
                  {explain && items.some((s) => s.startsAt === explain.startsAt) ? (
                    <motion.p
                      role="status"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={spring.snappy}
                      className="mt-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-caption text-foreground"
                    >
                      <Info className="size-4 shrink-0 text-ink-info" aria-hidden />
                      <span>
                        <b className="font-semibold">{salonTimeLabel(explain.startsAt)}</b> · {explain.reason}
                      </span>
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </section>
            );
          })
        )}
      </LayoutGroup>
    </div>
  );
}

function SlotChip({ slot, index, selected, onPick, reduce, groupId }) {
  const off = isOff(slot);
  const limited = slot.availability === "limited";
  const label = salonTimeLabel(slot.startsAt);
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={off || undefined}
      aria-label={`${label}${limited ? ", filling fast" : ""}${off ? `, ${slot.reason ?? DEFAULT_REASON[slot.availability]}` : ""}`}
      onClick={() => onPick(slot)}
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring.soft, delay: reduce ? 0 : Math.min(index, 12) * 0.025 }}
      whileTap={off || reduce ? undefined : { scale: 0.94 }}
      className={cn(
        "relative flex h-12 flex-col items-center justify-center rounded-control text-sm font-semibold tabular-nums transition-colors",
        selected ? "text-portal-foreground" : off ? "bg-muted/60 text-ink-neutral" : "bg-card ring-1 ring-inset ring-border/70 hover:ring-portal/50",
        limited && !selected && "ring-warning/50"
      )}
    >
      {selected ? <motion.span layoutId={`${groupId}-pill`} aria-hidden className="absolute inset-0 rounded-control bg-portal shadow-glow" transition={reduce ? { duration: 0 } : spring.snappy} /> : null}
      <span className={cn("relative inline-flex items-center gap-1", off && "line-through decoration-1 opacity-70")}>
        {selected ? (
          <motion.span initial={reduce ? false : { scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={spring.bouncy} className="inline-grid">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </motion.span>
        ) : null}
        {label}
      </span>
      {limited && !off ? (
        <span className={cn("relative mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold leading-none", selected ? "opacity-90" : "text-ink-warning")}>
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          {slot.seatsLeft ? `${slot.seatsLeft} left` : "Filling fast"}
        </span>
      ) : null}
    </motion.button>
  );
}

const BAR = { free: "bg-success/70", limited: "bg-warning/80", busy: "bg-destructive/35", unavailable: "bg-muted-foreground/25" };

function Timeline({ slots, value, onPick, reduce, groupId }) {
  return (
    <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-2">
      <div role="radiogroup" aria-label="Times on a timeline" className="flex min-w-max items-end gap-1.5 pt-6">
        {slots.map((slot, i) => {
          const selected = slot.startsAt === value;
          const showHour = i === 0 || salonHour(slot.startsAt) !== salonHour(slots[i - 1].startsAt);
          const label = salonTimeLabel(slot.startsAt);
          return (
            <button
              key={slot.startsAt}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${label}${isOff(slot) ? `, ${slot.reason ?? DEFAULT_REASON[slot.availability]}` : ""}`}
              onClick={() => onPick(slot)}
              className="group relative flex w-9 flex-col items-center"
            >
              {showHour ? <span className="absolute -top-5 left-0 whitespace-nowrap text-micro font-semibold text-ink-neutral">{label}</span> : null}
              <motion.span
                aria-hidden
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ ...spring.soft, delay: reduce ? 0 : i * 0.015 }}
                className={cn("block h-16 w-full origin-bottom rounded-lg", BAR[slot.availability ?? "free"] ?? BAR.free, "group-hover:opacity-80")}
              />
              {selected ? <motion.span layoutId={`${groupId}-tl`} aria-hidden className="absolute inset-x-0 bottom-0 h-16 rounded-lg bg-portal shadow-glow ring-2 ring-portal-foreground/40" transition={spring.snappy} /> : null}
              {selected ? <span className="absolute -bottom-6 whitespace-nowrap text-micro font-bold text-portal">{label}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-7 flex flex-wrap gap-3 text-micro text-ink-neutral">
        {[
          ["Open", "bg-success/70"],
          ["Filling fast", "bg-warning/80"],
          ["Booked", "bg-destructive/35"],
        ].map(([l, c]) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", c)} aria-hidden />
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}
