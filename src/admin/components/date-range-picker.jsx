"use client";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatIsoDate, salonDateIso } from "@/lib/salon-date";

/* ---------- date helpers (all local time, "YYYY-MM-DD" strings) ---------- */
const pad = (n) => `${n}`.padStart(2, "0");
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const sameDay = (a, b) => a && b && ymd(a) === ymd(b);
const short = (d, withYear) => formatIsoDate(ymd(d), { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });

/** Local start/end of a "YYYY-MM-DD" day as ISO strings (what the API filters on). */
export const dayStartIso = (s) => (s ? new Date(`${s}T00:00:00`).toISOString() : undefined);
export const dayEndIso = (s) => (s ? new Date(`${s}T23:59:59.999`).toISOString() : undefined);

export const PAST_PRESETS = [
  { key: "today", label: "Today", range: (t) => ({ from: ymd(t), to: ymd(t) }) },
  { key: "yesterday", label: "Yesterday", range: (t) => ({ from: ymd(addDays(t, -1)), to: ymd(addDays(t, -1)) }) },
  { key: "7d", label: "7 days", range: (t) => ({ from: ymd(addDays(t, -6)), to: ymd(t) }) },
  { key: "30d", label: "30 days", range: (t) => ({ from: ymd(addDays(t, -29)), to: ymd(t) }) },
  { key: "month", label: "This month", range: (t) => ({ from: ymd(startOfMonth(t)), to: ymd(t) }) },
  { key: "lastmonth", label: "Last month", range: (t) => ({ from: ymd(new Date(t.getFullYear(), t.getMonth() - 1, 1)), to: ymd(new Date(t.getFullYear(), t.getMonth(), 0)) }) },
];

export const FUTURE_PRESETS = [
  { key: "always", label: "Always on", range: () => ({ from: "", to: "" }) },
  { key: "today", label: "Today", range: (t) => ({ from: ymd(t), to: ymd(t) }) },
  { key: "7d", label: "Next 7 days", range: (t) => ({ from: ymd(t), to: ymd(addDays(t, 6)) }) },
  { key: "month", label: "This month", range: (t) => ({ from: ymd(t), to: ymd(endOfMonth(t)) }) },
  { key: "30d", label: "Next 30 days", range: (t) => ({ from: ymd(t), to: ymd(addDays(t, 29)) }) },
];

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

function monthCells(view) {
  const first = startOfMonth(view);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const days = endOfMonth(view).getDate();
  return Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => (i < lead || i >= lead + days ? null : new Date(view.getFullYear(), view.getMonth(), i - lead + 1)));
}

/**
 * Date range control: quick presets plus a calendar for a custom range, in one small popover
 * (a bottom sheet on phones). `value` is { from, to } as "YYYY-MM-DD" ("" = open ended).
 */
export function DateRangePicker({ value, onChange, presets = PAST_PRESETS, allowFuture = false, allowPast = true, anyLabel = "Any date", className, label = "Date range", inline = false }) {
  // "Today" is the salon's calendar day, whatever the device time zone.
  const today = useMemo(() => parseYmd(salonDateIso()), []);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [view, setView] = useState(() => startOfMonth(today));
  const [hover, setHover] = useState(null);
  const root = useRef(null);

  const activePreset = presets.find((p) => {
    const r = p.range(today);
    return r.from === (value.from ?? "") && r.to === (value.to ?? "");
  });
  const text = activePreset
    ? activePreset.label
    : value.from && value.to
      ? value.from === value.to
        ? short(parseYmd(value.from), true)
        : `${short(parseYmd(value.from))} – ${short(parseYmd(value.to), true)}`
      : value.from
        ? `From ${short(parseYmd(value.from), true)}`
        : value.to
          ? `Until ${short(parseYmd(value.to), true)}`
          : anyLabel;

  const openPicker = () => {
    setDraft({ from: value.from ?? "", to: value.to ?? "" });
    setView(startOfMonth(parseYmd(value.to) ?? parseYmd(value.from) ?? today));
    setHover(null);
    setOpen(true);
  };

  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !root.current?.contains(e.target) && close();
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const disabledDay = (d) => (!allowFuture && d > today) || (!allowPast && d < today);

  function pick(d) {
    const s = ymd(d);
    if (!draft.from || draft.to) setDraft({ from: s, to: "" });
    else if (s < draft.from) setDraft({ from: s, to: draft.from });
    else setDraft({ from: draft.from, to: s });
  }

  const preview = draft.from && !draft.to && hover ? (ymd(hover) < draft.from ? { from: ymd(hover), to: draft.from } : { from: draft.from, to: ymd(hover) }) : draft;
  const inRange = (d) => preview.from && preview.to && ymd(d) > preview.from && ymd(d) < preview.to;
  const canApply = Boolean(draft.from);

  const apply = () => {
    onChange({ from: draft.from, to: draft.to || draft.from });
    close();
  };

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${text}`}
        onClick={() => (open ? close() : openPicker())}
        className={cn("flex h-11 w-full items-center gap-2 rounded-control bg-card px-3.5 text-sm font-semibold shadow-soft ring-1 ring-inset ring-border/60 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-portal sm:w-auto", open && "ring-2 ring-portal")}
      >
        <CalendarDays className="size-4 text-portal" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{text}</span>
        <ChevronDown className={cn("size-4 text-ink-neutral transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label={label}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className={cn(
              "glass-strong rounded-sheet p-3 text-popover-foreground",
              // inline: expands in the page flow (needed inside slide-overs, which clip and transform floating children)
              inline ? "mt-2 w-full max-w-sm" : "fixed inset-x-3 bottom-[calc(0.75rem+var(--safe-bottom))] z-popover shadow-float sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:w-[20rem]"
            )}
          >
            {/* Presets */}
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 sm:flex-wrap sm:overflow-visible">
              {presets.map((p) => {
                const on = activePreset?.key === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      onChange(p.range(today));
                      close();
                    }}
                    className={cn("tap h-9 shrink-0 rounded-full px-3 text-caption font-semibold ring-1 ring-inset transition-colors", on ? "bg-portal text-portal-foreground ring-portal" : "bg-card ring-border hover:bg-muted")}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Calendar */}
            <div className="mt-1 rounded-2xl bg-muted/40 p-2">
              <div className="mb-1 flex items-center justify-between">
                <button type="button" aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="tap grid size-9 place-items-center rounded-xl hover:bg-muted">
                  <ChevronLeft className="size-4" aria-hidden />
                </button>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={`${view.getFullYear()}-${view.getMonth()}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }} className="text-sm font-semibold">
                    {formatIsoDate(ymd(view), { month: "long", year: "numeric" })}
                  </motion.span>
                </AnimatePresence>
                <button type="button" aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="tap grid size-9 place-items-center rounded-xl hover:bg-muted">
                  <ChevronRight className="size-4" aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-7 text-center text-[10px] font-semibold uppercase text-ink-neutral">
                {WEEKDAYS.map((w, i) => (
                  <span key={i} className="py-1">
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7" onMouseLeave={() => setHover(null)}>
                {monthCells(view).map((d, i) => {
                  if (!d) return <span key={i} />;
                  const s = ymd(d);
                  const start = s === preview.from;
                  const end = s === preview.to;
                  const middle = inRange(d);
                  const off = disabledDay(d);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={off}
                      onClick={() => pick(d)}
                      onMouseEnter={() => setHover(d)}
                      className={cn(
                        "relative my-0.5 grid h-10 place-items-center text-sm tabular-nums transition-colors",
                        middle && "bg-portal/12",
                        start && preview.to && "rounded-l-full bg-portal/12",
                        end && preview.from && preview.from !== preview.to && "rounded-r-full bg-portal/12",
                        off && "cursor-not-allowed opacity-30"
                      )}
                    >
                      <span className={cn("grid size-9 place-items-center rounded-full", (start || end) && "bg-portal font-semibold text-portal-foreground", !start && !end && !off && "hover:bg-muted", sameDay(d, today) && !start && !end && "ring-1 ring-portal/60")}>{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-caption font-semibold text-ink-neutral">{draft.from ? `${short(parseYmd(draft.from))}${draft.to && draft.to !== draft.from ? ` → ${short(parseYmd(draft.to))}` : ""}` : "Pick a start date"}</p>
              <div className="flex gap-1.5">
                {anyLabel && presets.every((p) => p.key !== "always") ? (
                  <button type="button" onClick={() => { onChange({ from: "", to: "" }); close(); }} aria-label="Clear dates" className="tap grid size-9 place-items-center rounded-xl bg-muted hover:bg-muted/70">
                    <X className="size-4" aria-hidden />
                  </button>
                ) : null}
                <button type="button" disabled={!canApply} onClick={apply} className="flex h-9 items-center gap-1.5 rounded-xl bg-portal px-3.5 text-caption font-semibold text-portal-foreground disabled:opacity-40">
                  <Check className="size-3.5" aria-hidden /> Apply
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
