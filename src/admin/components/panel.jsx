"use client";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/components/motion";
import { cn } from "@/lib/utils";

/**
 * The admin section card: icon tile + short title, optional trailing action, body. Rises in the first
 * time it scrolls into view. `bodyClassName` controls body padding (default p-4 sm:p-5).
 */
export function Panel({ title, icon: Icon, action, subtitle, children, className, bodyClassName, delay = 0, as = "section", id }) {
  const reduce = useReducedMotion();
  const Comp = as === "div" ? motion.div : motion.section;
  return (
    <Comp
      id={id}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ ...spring.soft, delay }}
      className={cn("min-w-0 overflow-hidden rounded-card border border-border/60 bg-card shadow-soft", className)}
    >
      {title ? (
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {Icon ? (
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-portal/12 text-portal">
                <Icon className="size-[18px]" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 className="truncate font-display text-base font-semibold">{title}</h2>
              {subtitle ? <p className="truncate text-caption text-ink-neutral">{subtitle}</p> : null}
            </div>
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName ?? "p-4 sm:p-5"}>{children}</div>
    </Comp>
  );
}
