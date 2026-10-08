import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { addDaysIso, daysInMonthIso, diffDaysIso, formatIsoDate, monthStartIso, salonDateIso, weekdayIndexIso } from "@/lib/salon-date";
import { haptic, spring } from "@/components/motion/presets";

/** Availability → dot colour. "closed" days are disabled. */
const DOT = { free: "bg-success", limited: "bg-warning", busy: "bg-destructive", closed: "" };
const AVAIL_LABEL = { free: "available", limited: "few slots left", busy: "almost full", closed: "closed" };

function useDayState({ minDate, maxDate, availability, isDisabled, today }) {
  return (iso) => {
    const past = diffDaysIso(today, iso) < 0;
    const outOfRange = (minDate && diffDaysIso(minDate, iso) < 0) || (maxDate && diffDaysIso(iso, maxDate) < 0);
    const avail = availability?.[iso];
    const disabled = past || outOfRange || avail === "closed" || Boolean(isDisabled?.(iso));
    return { past, disabled, avail, isToday: iso === today };
  };
}

function dayAria(iso, st) {
  const parts = [formatIsoDate(iso, { weekday: "long", day: "numeric", month: "long" })];
  if (st.isToday) parts.push("today");
  if (st.avail) parts.push(AVAIL_LABEL[st.avail]);
  if (st.disabled) parts.push("unavailable");
  return parts.join(", ");
}

/**
 * THE date picker (contract item b): a swipeable strip of day chips (weekday, date, availability
 * dot, glowing today) with an expandable month view. Salon-time-zone aware: all dates are
 * YYYY-MM-DD strings in salon time (src/lib/salon-date.js). Keyboard: ←/→ move, Home/End jump,
 * Enter/Space select. No data fetching: pass `availability` from the caller.
 * @param {{ value?: string, onChange: (iso:string)=>void, startDate?: string, days?: number, minDate?: string, maxDate?: string,
 *   availability?: Record<string,"free"|"limited"|"busy"|"closed">, isDisabled?: (iso:string)=>boolean,
 *   expandable?: boolean, label?: string, className?: string }} props
 */
export function DateStrip({ value, onChange, startDate, days = 30, minDate, maxDate, availability, isDisabled, expandable = true, label = "Choose a date", className }) {
  const reduce = useReducedMotion();
  const today = salonDateIso(0);
  const start = startDate ?? today;
  const list = useMemo(() => Array.from({ length: days }, (_, i) => addDaysIso(start, i)), [start, days]);
  const dayState = useDayState({ minDate: minDate ?? today, maxDate, availability, isDisabled, today });
  const [emblaRef, embla] = useEmblaCarousel({ dragFree: true, align: "start", containScroll: "trimSnaps", skipSnaps: true });
  const [expanded, setExpanded] = useState(false);
  const [focusIdx, setFocusIdx] = useState(() => Math.max(0, list.indexOf(value)));
  const chipRefs = useRef([]);
  const groupId = useId();

  // Keep the selected day in view when it changes from outside (e.g. picked in the month view).
  useEffect(() => {
    const i = list.indexOf(value);
    if (i >= 0 && embla) embla.scrollTo(Math.max(0, i - 2));
  }, [value, embla, list]);

  const select = (iso) => {
    if (dayState(iso).disabled) return;
    haptic("tap");
    onChange?.(iso);
  };
  const moveFocus = (i) => {
    const next = Math.max(0, Math.min(list.length - 1, i));
    setFocusIdx(next);
    chipRefs.current[next]?.focus();
    embla?.scrollTo(Math.max(0, next - 2));
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold" id={`${groupId}-label`}>
          <CalendarDays className="size-4 text-portal" aria-hidden />
          {value ? formatIsoDate(value, { month: "long", year: "numeric" }) : label}
        </p>
        {expandable ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="tap inline-flex h-8 items-center gap-1 rounded-full px-3 text-caption font-semibold text-portal hover:bg-portal/10"
          >
            {expanded ? "Less" : "Month"}
            <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={spring.snappy} className="inline-grid">
              <ChevronRight className="size-3.5" aria-hidden />
            </motion.span>
          </button>
        ) : null}
      </div>

      <div className="-mx-1 overflow-hidden px-1 py-1" ref={emblaRef}>
        <LayoutGroup id={groupId}>
          <div role="listbox" aria-labelledby={`${groupId}-label`} aria-orientation="horizontal" className="flex touch-pan-y gap-2">
            {list.map((iso, i) => {
              const st = dayState(iso);
              const selected = iso === value;
              const firstOfMonth = iso.endsWith("-01") || i === 0;
              return (
                <button
                  key={iso}
                  ref={(el) => (chipRefs.current[i] = el)}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-disabled={st.disabled || undefined}
                  aria-label={dayAria(iso, st)}
                  tabIndex={i === (list.indexOf(value) >= 0 ? list.indexOf(value) : focusIdx) ? 0 : -1}
                  onClick={() => select(iso)}
                  onKeyDown={(e) => {
                    const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: list.length - 1 };
                    if (e.key in keys) {
                      e.preventDefault();
                      moveFocus(keys[e.key]);
                    }
                  }}
                  className={cn(
                    "relative flex h-[4.75rem] w-[3.75rem] shrink-0 flex-col items-center justify-center rounded-xl text-center transition-colors duration-100",
                    selected ? "text-portal-foreground" : "bg-card text-foreground ring-1 ring-inset ring-border/70 hover:ring-portal/40",
                    st.isToday && !selected && "ring-2 ring-portal/60",
                    st.disabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  {selected ? <span aria-hidden className="absolute inset-0 -z-0 rounded-xl bg-portal" /> : null}
                  <span className={cn("relative text-micro font-semibold uppercase", !selected && "text-ink-neutral")}>{st.isToday ? "Today" : formatIsoDate(iso, { weekday: "short" })}</span>
                  <span className="relative font-display text-xl font-bold leading-tight tabular-nums">{formatIsoDate(iso, { day: "numeric" })}</span>
                  <span className={cn("relative text-[10px] font-medium leading-none", selected ? "opacity-90" : "text-ink-neutral", !firstOfMonth && "invisible")}>{formatIsoDate(iso, { month: "short" })}</span>
                  {st.avail && DOT[st.avail] ? <span aria-hidden className={cn("absolute top-1.5 right-1.5 size-1.5 rounded-full", DOT[st.avail], selected && "ring-2 ring-portal-foreground/70")} /> : null}
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="month"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring.sheet}
            className="overflow-hidden"
          >
            <MonthExpander
              className="mt-3"
              value={value}
              onChange={(iso) => {
                select(iso);
                setExpanded(false);
              }}
              minDate={minDate}
              maxDate={maxDate ?? list[list.length - 1]}
              availability={availability}
              isDisabled={isDisabled}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Month grid used by DateStrip's "Month" toggle; usable on its own (e.g. admin reschedule on desktop).
 * Keyboard: arrows move by day/week, PageUp/PageDown change month, Enter selects.
 */
export function MonthExpander({ value, onChange, minDate, maxDate, availability, isDisabled, className }) {
  const reduce = useReducedMotion();
  const today = salonDateIso(0);
  const [month, setMonth] = useState(() => monthStartIso(value ?? today));
  const [dir, setDir] = useState(0);
  const [focusIso, setFocusIso] = useState(value ?? today);
  const cellRefs = useRef({});
  const dayState = useDayState({ minDate: minDate ?? today, maxDate, availability, isDisabled, today });
  const count = daysInMonthIso(month);
  const lead = weekdayIndexIso(month);
  const cells = Array.from({ length: count }, (_, i) => addDaysIso(month, i));
  const canPrev = diffDaysIso(monthStartIso(today), month) > 0;
  const canNext = !maxDate || diffDaysIso(month, monthStartIso(maxDate)) > 0;

  const go = (delta) => {
    setDir(delta);
    setMonth((m) => monthStartIso(m, delta));
  };
  const focusDay = (iso) => {
    if (monthStartIso(iso) !== month) go(diffDaysIso(month, iso) > 0 ? 1 : -1);
    setFocusIso(iso);
    requestAnimationFrame(() => requestAnimationFrame(() => cellRefs.current[iso]?.focus()));
  };

  return (
    <div className={cn("rounded-card bg-card p-3 ring-1 ring-inset ring-border/70 sm:p-4", className)}>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => go(-1)} aria-label="Previous month" className="grid size-11 place-items-center rounded-2xl hover:bg-muted disabled:opacity-30">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="relative h-6 flex-1 overflow-hidden text-center">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.p
              key={month}
              custom={dir}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -40 }}
              transition={spring.soft}
              className="font-display text-sm font-semibold"
              aria-live="polite"
            >
              {formatIsoDate(month, { month: "long", year: "numeric" })}
            </motion.p>
          </AnimatePresence>
        </div>
        <button type="button" disabled={!canNext} onClick={() => go(1)} aria-label="Next month" className="grid size-11 place-items-center rounded-2xl hover:bg-muted disabled:opacity-30">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={formatIsoDate(month, { month: "long", year: "numeric" })}>
        {WEEKDAYS.map((d, i) => (
          <span key={i} aria-hidden className="pb-1 text-micro font-semibold text-ink-neutral">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`lead-${i}`} aria-hidden />
        ))}
        {cells.map((iso, i) => {
          const st = dayState(iso);
          const selected = iso === value;
          return (
            <motion.button
              key={iso}
              ref={(el) => (cellRefs.current[iso] = el)}
              type="button"
              role="gridcell"
              aria-selected={selected}
              aria-disabled={st.disabled || undefined}
              aria-label={dayAria(iso, st)}
              tabIndex={iso === focusIso || (monthStartIso(focusIso) !== month && i === 0) ? 0 : -1}
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: st.disabled ? 0.35 : 1, scale: 1 }}
              transition={{ ...spring.soft, delay: reduce ? 0 : Math.min(i, 20) * 0.008 }}
              onClick={() => !st.disabled && onChange?.(iso)}
              onKeyDown={(e) => {
                const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[e.key];
                if (step) {
                  e.preventDefault();
                  focusDay(addDaysIso(iso, step));
                } else if (e.key === "PageDown" || e.key === "PageUp") {
                  e.preventDefault();
                  go(e.key === "PageDown" ? 1 : -1);
                }
              }}
              className={cn(
                "relative mx-auto grid aspect-square w-full max-w-11 place-items-center rounded-xl text-sm font-semibold tabular-nums",
                selected ? "bg-portal text-portal-foreground shadow-glow" : "hover:bg-muted",
                st.isToday && !selected && "ring-2 ring-inset ring-portal/60",
                st.disabled && "cursor-not-allowed"
              )}
            >
              {formatIsoDate(iso, { day: "numeric" })}
              {st.avail && DOT[st.avail] ? <span aria-hidden className={cn("absolute bottom-1 size-1 rounded-full", DOT[st.avail])} /> : null}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
