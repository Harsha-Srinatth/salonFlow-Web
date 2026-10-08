import { Check, Clock, Info, Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatIsoDate, salonDateOf, salonHour, salonRelativeDayLabel, salonTimeLabel } from "@/lib/salon-date";
import { haptic } from "@/components/motion/presets";
import { SkeletonSlots } from "@/components/motion/skeleton-shimmer";

const PARTS = [
  { key: "morning", label: "Morning", icon: Sunrise, test: (h) => h < 12 },
  { key: "afternoon", label: "Afternoon", icon: Sun, test: (h) => h >= 12 && h < 17 },
  { key: "evening", label: "Evening", icon: Sunset, test: (h) => h >= 17 && h < 21 },
  { key: "night", label: "Night", icon: Moon, test: (h) => h >= 21 },
];
const DEFAULT_REASON = { busy: "Fully booked", unavailable: "Not available" };
const isOff = (s) => s.availability === "busy" || s.availability === "unavailable";

/**
 * Day selector for booking flows that offer a short, fixed window (today / tomorrow): large tabs
 * with the full date, so the chosen day is never in doubt.
 * @param {{ days: string[], value: string, onChange: (iso:string)=>void, label?: string, className?: string }} props
 */
export function DayTabs({ days, value, onChange, label = "Day", className }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", days.length === 2 ? "grid-cols-2" : "grid-cols-3", className)}>
      {days.map((iso) => {
        const active = iso === value;
        return (
          <button
            key={iso}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (active) return;
              haptic("tap");
              onChange(iso);
            }}
            className={cn(
              "flex min-h-14 flex-col items-start justify-center rounded-control px-4 py-2 text-left transition-colors duration-100",
              active ? "bg-primary text-primary-foreground" : "bg-card ring-1 ring-inset ring-border hover:ring-primary/50"
            )}
          >
            <span className="text-sm font-semibold">{salonRelativeDayLabel(iso)}</span>
            <span className={cn("text-caption", active ? "opacity-85" : "text-ink-neutral")}>{formatIsoDate(iso, { weekday: "short", day: "numeric", month: "short" })}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The time picker. Props-driven: give it slots, it never fetches.
 * Slot shape: { startsAt: ISO, availability?: "free"|"limited"|"busy"|"unavailable", reason?: string, seatsLeft?: number }
 * (the booking API's `{ startsAt }` objects work as-is: they render as open).
 *
 * Layout: an availability summary with day-part filters (each with its open count), then the
 * times as large chips grouped by part of day, then a one-line confirmation of the picked time
 * (with the end time when `durationMinutes` is known). Tapping an unavailable time says why.
 * Selection is instant; nothing animates in.
 * @param {{ slots: object[], value?: string, onChange: (startsAt:string, slot:object)=>void, loading?: boolean,
 *   durationMinutes?: number, empty?: React.ReactNode, className?: string }} props
 */
export function TimeSlotPicker({ slots = [], value, onChange, loading = false, durationMinutes, empty, className }) {
  const [part, setPart] = useState("all");
  const [explain, setExplain] = useState(null);

  useEffect(() => {
    if (!explain) return undefined;
    const t = setTimeout(() => setExplain(null), 3200);
    return () => clearTimeout(t);
  }, [explain]);

  const groups = useMemo(() => {
    const out = PARTS.map((p) => ({ ...p, items: [], open: 0 }));
    for (const slot of slots) {
      const g = out.find((p) => p.test(salonHour(slot.startsAt))) ?? out[0];
      g.items.push(slot);
      if (!isOff(slot)) g.open += 1;
    }
    return out.filter((g) => g.items.length);
  }, [slots]);

  // A filter left over from another day (or a part with no times now) falls back to "all".
  const activePart = groups.some((g) => g.key === part) ? part : "all";
  const shown = activePart === "all" ? groups : groups.filter((g) => g.key === activePart);
  const open = groups.reduce((n, g) => n + g.open, 0);
  const selected = value ? slots.find((s) => s.startsAt === value) : null;

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
    <div className={cn("space-y-4", loading && "opacity-60 transition-opacity", className)} aria-busy={loading || undefined}>
      {/* Overview: how many times are open, and quick filters by part of day. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-ink-neutral">
          <span className="font-semibold text-foreground tabular-nums">{open}</span> open {open === 1 ? "time" : "times"}
        </p>
        <ul className="flex items-center gap-3 text-micro text-ink-neutral" aria-label="Legend">
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm ring-1 ring-inset ring-border bg-card" /> Open
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-warning" /> Few left
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm bg-muted" /> Taken
          </li>
        </ul>
      </div>

      {groups.length > 1 ? (
        <div role="tablist" aria-label="Part of day" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {[{ key: "all", label: "All", open }, ...groups].map((g) => {
            const active = activePart === g.key;
            const Icon = g.icon;
            return (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPart(g.key)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-caption font-semibold transition-colors duration-100",
                  active ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70"
                )}
              >
                {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
                {g.label}
                <span className={cn("tabular-nums", active ? "opacity-75" : "text-ink-neutral")}>{g.open}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {shown.map(({ key, label, icon: Icon, items, open: partOpen }) => (
        <section key={key} aria-label={label}>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Icon className="size-4 text-portal" aria-hidden />
            {label}
            <span className="text-caption font-normal text-ink-neutral">
              · {salonTimeLabel(items[0].startsAt)} – {salonTimeLabel(items[items.length - 1].startsAt)} · {partOpen} open
            </span>
          </p>
          <div role="radiogroup" aria-label={`${label} times`} className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((slot) => (
              <SlotChip key={slot.startsAt} slot={slot} selected={value === slot.startsAt} onPick={pick} />
            ))}
          </div>
          {explain && items.some((s) => s.startsAt === explain.startsAt) ? (
            <p role="status" className="mt-2 flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-caption text-foreground">
              <Info className="size-4 shrink-0 text-ink-info" aria-hidden />
              <span>
                <b className="font-semibold">{salonTimeLabel(explain.startsAt)}</b> · {explain.reason}
              </span>
            </p>
          ) : null}
        </section>
      ))}

      <p aria-live="polite" className={cn("flex min-h-11 items-center gap-2 rounded-control px-3 text-sm", selected ? "bg-primary/10 text-foreground" : "bg-muted/60 text-ink-neutral")}>
        <Clock className={cn("size-4 shrink-0", selected ? "text-portal" : "")} aria-hidden />
        {selected ? (
          <span>
            <span className="font-semibold">{salonRelativeDayLabel(salonDateOf(selected.startsAt))}</span>
            {" · "}
            <span className="font-semibold tabular-nums">
              {salonTimeLabel(selected.startsAt)}
              {durationMinutes > 0 ? ` – ${salonTimeLabel(new Date(new Date(selected.startsAt).getTime() + durationMinutes * 60000).toISOString())}` : ""}
            </span>
            {durationMinutes > 0 ? <span className="text-ink-neutral"> ({durationMinutes} min)</span> : null}
          </span>
        ) : (
          "Pick a time to continue"
        )}
      </p>
    </div>
  );
}

function SlotChip({ slot, selected, onPick }) {
  const off = isOff(slot);
  const limited = slot.availability === "limited";
  const label = salonTimeLabel(slot.startsAt);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={off || undefined}
      aria-label={`${label}${limited ? ", few left" : ""}${off ? `, ${slot.reason ?? DEFAULT_REASON[slot.availability]}` : ""}`}
      onClick={() => onPick(slot)}
      className={cn(
        "relative flex h-12 flex-col items-center justify-center rounded-control text-sm font-semibold tabular-nums transition-colors duration-100 active:scale-[0.97]",
        selected
          ? "bg-primary text-primary-foreground"
          : off
            ? "bg-muted text-ink-neutral"
            : cn("bg-card ring-1 ring-inset hover:ring-primary/60", limited ? "ring-warning/60" : "ring-border")
      )}
    >
      <span className={cn("inline-flex items-center gap-1", off && "line-through decoration-1 opacity-70")}>
        {selected ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
        {label}
      </span>
      {limited && !off ? (
        <span className={cn("mt-0.5 inline-flex items-center gap-1 text-[10px] leading-none font-semibold", selected ? "opacity-90" : "text-ink-warning")}>
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          {slot.seatsLeft ? `${slot.seatsLeft} left` : "Few left"}
        </span>
      ) : null}
    </button>
  );
}
