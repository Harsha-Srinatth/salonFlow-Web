import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Sign-in / sign-up / OTP layout. Desktop: brand panel + form card. Phone: compact brand header
 * with the card overlapping it. Renders instantly (no entrance animation) so the form is usable
 * on first paint. Keep copy short; `highlights` are icon + 2–4 words.
 * @param {{ title: string, subtitle?: string, highlights?: {icon:any,label:string}[], brand?: string, footer?: React.ReactNode,
 *   children: React.ReactNode, className?: string }} props
 */
export function AuthLayout({ title, subtitle, highlights = [], brand = "Sahasra", footer, children, className }) {
  return (
    <div className={cn("relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]", className)}>
      <section className="relative bg-card px-6 pt-[calc(1.75rem+var(--safe-top))] pb-20 lg:flex lg:flex-col lg:justify-between lg:border-r lg:border-border lg:p-12">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-portal font-display text-lg font-bold text-portal-foreground">{brand.charAt(0)}</span>
          <span className="font-display text-xl font-bold">{brand}</span>
        </Link>
        <div className="mt-8 lg:mt-0">
          <h1 className="font-display text-display-lg font-bold lg:text-display-xl">{title}</h1>
          {subtitle ? <p className="mt-3 max-w-md text-body text-ink-neutral">{subtitle}</p> : null}
          {highlights.length ? (
            <ul className="mt-6 hidden flex-wrap gap-2 lg:flex">
              {highlights.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-semibold">
                  <Icon className="size-4 text-portal" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="hidden text-caption text-ink-neutral lg:block">© {new Date().getFullYear()} {brand}</p>
      </section>
      <section className="relative -mt-12 flex items-start justify-center px-4 pb-[calc(2rem+var(--safe-bottom))] lg:mt-0 lg:items-center lg:px-12">
        <div className="glass-strong w-full max-w-md rounded-sheet p-6 sm:p-8">
          {children}
          {footer ? <div className="mt-6 border-t border-border/60 pt-4 text-center text-sm text-ink-neutral">{footer}</div> : null}
        </div>
      </section>
    </div>
  );
}
