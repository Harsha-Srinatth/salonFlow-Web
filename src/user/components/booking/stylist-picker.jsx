import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Check, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic, interaction, spring } from "@/components/motion/presets";
import { Avatar } from "@/components/kit";
import { SkeletonList } from "@/components/motion/skeleton-shimmer";

/**
 * Stylist choice before picking a time. "Any stylist" keeps the old behaviour (the first stylist
 * free at the chosen time). Availability is counted from the day's slots (`slot.stylists`) the API
 * already returned; when slots carry no stylist data no count is shown.
 */
export function StylistPicker({ stylists, value, onChange, freeCounts, dayLabel, loading }) {
  const reduce = useReducedMotion();
  if (loading && !stylists.length) return <SkeletonList rows={3} label="Loading stylists" />;
  const options = [{ id: "", name: "Any stylist" }, ...stylists];
  return (
    <LayoutGroup id="stylist-picker">
      <div role="radiogroup" aria-label="Stylist" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {options.map((stylist, i) => {
          const active = (value ?? "") === stylist.id;
          const any = !stylist.id;
          const free = freeCounts ? (any ? freeCounts.any : freeCounts.byId[stylist.id] ?? 0) : null;
          const full = free === 0;
          return (
            <motion.button
              key={stylist.id || "any"}
              type="button"
              role="radio"
              aria-checked={active}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: full && !active ? 0.6 : 1, y: 0 }}
              transition={{ ...spring.soft, delay: reduce ? 0 : Math.min(i, 8) * 0.05 }}
              whileHover={reduce ? undefined : interaction.cardHover}
              whileTap={reduce ? undefined : interaction.press}
              onClick={() => {
                haptic("tap");
                onChange(stylist.id);
              }}
              className={cn(
                "relative flex min-h-20 items-center gap-3 rounded-card p-4 text-left shadow-soft ring-1 ring-inset transition-shadow",
                active ? "ring-transparent" : "bg-card ring-border/60 hover:shadow-lift"
              )}
            >
              {active ? <motion.span layoutId="stylist-pill" transition={reduce ? { duration: 0 } : spring.snappy} className="absolute inset-0 rounded-card bg-portal/10 shadow-glow ring-2 ring-inset ring-portal" /> : null}
              {any ? (
                <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-portal text-portal-foreground">
                  <Shuffle className="size-5" aria-hidden />
                </span>
              ) : (
                <Avatar name={stylist.name} src={stylist.photoUrl ?? stylist.avatar} size="md" status={free == null ? undefined : full ? "busy" : "online"} className="relative" />
              )}
              <span className="relative min-w-0 flex-1">
                <span className="block truncate font-semibold">{stylist.name}</span>
                <span className="block text-caption text-ink-neutral">
                  {any ? "First free at your time" : free == null ? "Tap to choose" : full ? `Full ${dayLabel}` : `${free} slot${free === 1 ? "" : "s"} ${dayLabel}`}
                </span>
              </span>
              {active ? (
                <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={spring.bouncy} className="relative grid size-7 place-items-center rounded-full bg-portal text-portal-foreground">
                  <Check className="size-4" strokeWidth={3} aria-hidden />
                </motion.span>
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
