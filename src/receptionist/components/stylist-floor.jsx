"use client";

import { Avatar } from "@/components/kit";
import { SkeletonShimmer } from "@/components/motion";
import { spring, stagger } from "@/components/motion/presets";
import { cn } from "@/lib/utils";
import { computeStylistAvailability } from "@/receptionist/lib/booking-utils";
import { Hourglass, Scissors, Sparkle, Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

const STATE = {
  available: { avatar: "online", label: "Free", icon: Sparkle, tone: "bg-success/12 text-ink-success" },
  busy: { avatar: "busy", label: "In service", icon: Scissors, tone: "bg-info/12 text-ink-info" },
  upcoming: { avatar: "away", label: "Up next", icon: Hourglass, tone: "bg-warning/14 text-ink-warning" },
};

/** Who is free right now. Status comes from the live queue (in service → busy, waiting → up next). */
export function StylistFloor({ stylists = [], queue = [], loading }) {
  const reduce = useReducedMotion();
  const floor = useMemo(() => computeStylistAvailability(stylists, queue), [stylists, queue]);
  const free = floor.filter((s) => s.status === "available").length;

  return (
    <section aria-label="Stylist floor" className="space-y-3">
      <header className="flex items-center gap-2">
        <Users className="size-4.5 text-portal" aria-hidden />
        <h2 className="font-display text-headline font-semibold">Stylists</h2>
        {floor.length ? <span className="text-caption font-semibold text-ink-neutral">{free} free · {floor.length} on floor</span> : null}
      </header>
      {loading && !floor.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[0, 1, 2].map((i) => (
            <SkeletonShimmer key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : !floor.length ? (
        <p className="rounded-2xl border border-dashed border-border/80 p-4 text-center text-sm text-ink-neutral">No active stylists</p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {floor.map((s, i) => {
            const st = STATE[s.status] ?? STATE.available;
            const Icon = st.icon;
            return (
              <motion.li
                key={s.id}
                layout={reduce ? false : "position"}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.soft, delay: Math.min(i, 10) * stagger.tight }}
                className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-border/60 bg-card p-2.5 shadow-soft"
              >
                <Avatar name={s.name} size="md" status={st.avatar} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.name}</span>
                  <span className={cn("mt-0.5 inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold", st.tone)}>
                    <Icon className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">{s.status === "busy" && s.currentCustomer ? s.currentCustomer : s.status === "upcoming" ? `${s.upcomingCount} next` : st.label}</span>
                  </span>
                </span>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
