import { cn } from "@/lib/utils";

/** A titled block in the lab. `id` becomes the anchor and the ?section= filter key. */
export function Section({ id, title, icon: Icon, children }) {
  return (
    <section id={id} data-lab-section={id} className="scroll-mt-28 space-y-5 border-t border-border/60 py-10 first:border-t-0">
      <h2 className="flex items-center gap-2.5 font-display text-title font-bold">
        {Icon ? (
          <span className="grid size-9 place-items-center rounded-xl bg-portal/12 text-portal">
            <Icon className="size-5" aria-hidden />
          </span>
        ) : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One component specimen with a label and optional state name. */
export function Specimen({ title, state, className, children, wide = false }) {
  return (
    <div className={cn("min-w-0 rounded-card border border-border/60 bg-card/60 p-4", wide && "md:col-span-2 xl:col-span-3", className)}>
      <p className="mb-3 flex items-center gap-2 text-caption font-semibold text-ink-neutral">
        {title}
        {state ? <span className="rounded-full bg-muted px-2 py-0.5 text-micro font-semibold uppercase">{state}</span> : null}
      </p>
      {children}
    </div>
  );
}

export function Grid({ children, className }) {
  return <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>{children}</div>;
}

export function Row({ children, className }) {
  return <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
