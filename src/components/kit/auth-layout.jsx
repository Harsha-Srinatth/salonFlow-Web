import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { spring, variants } from "@/components/motion/presets";
import { AuroraBackground } from "./aurora-background";

/**
 * Sign-in / sign-up / OTP layout. Desktop: aurora brand panel + glass form card. Phone: compact
 * brand header with the card rising over it. Keep copy short; `highlights` are icon + 2–4 words.
 * @param {{ title: string, subtitle?: string, highlights?: {icon:any,label:string}[], brand?: string, footer?: React.ReactNode,
 *   children: React.ReactNode, className?: string }} props
 */
export function AuthLayout({ title, subtitle, highlights = [], brand = "Sahasra", footer, children, className }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("relative isolate grid min-h-dvh lg:grid-cols-[1.05fr_1fr]", className)}>
      <section className="relative isolate overflow-hidden px-6 pt-[calc(1.75rem+var(--safe-top))] pb-20 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <AuroraBackground />
        <Link to="/" className="inline-flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-portal font-display text-lg font-bold text-portal-foreground shadow-glow">{brand.charAt(0)}</span>
          <span className="font-display text-xl font-bold">{brand}</span>
        </Link>
        <motion.div className="mt-8 lg:mt-0" variants={variants.stagger(0.08, 0.1)} initial={reduce ? false : "hidden"} animate="show">
          <motion.h1 variants={variants.fadeUp} className="font-display text-display-lg font-bold lg:text-display-xl">
            {title}
          </motion.h1>
          {subtitle ? (
            <motion.p variants={variants.fadeUp} className="mt-3 max-w-md text-body text-ink-neutral">
              {subtitle}
            </motion.p>
          ) : null}
          {highlights.length ? (
            <motion.ul variants={variants.fadeUp} className="mt-6 hidden flex-wrap gap-2 lg:flex">
              {highlights.map(({ icon: Icon, label }) => (
                <li key={label} className="glass-surface inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold">
                  <Icon className="size-4 text-portal" aria-hidden />
                  {label}
                </li>
              ))}
            </motion.ul>
          ) : null}
        </motion.div>
        <p className="hidden text-caption text-ink-neutral lg:block">© {new Date().getFullYear()} {brand}</p>
      </section>
      <section className="relative -mt-12 flex items-start justify-center px-4 pb-[calc(2rem+var(--safe-bottom))] lg:mt-0 lg:items-center lg:px-12">
        <motion.div initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring.sheet, delay: 0.1 }} className="glass-strong w-full max-w-md rounded-sheet p-6 sm:p-8">
          {children}
          {footer ? <div className="mt-6 border-t border-border/60 pt-4 text-center text-sm text-ink-neutral">{footer}</div> : null}
        </motion.div>
      </section>
    </div>
  );
}
