import { cn } from "@/lib/utils";
/** Icon + short copy + optional CTA, for any empty list. */
export function EmptyState({ icon: Icon, title, description, action, className }) {
    return (<div className={cn("flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-12 text-center", className)}>
      {Icon ? (<span className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
          <Icon className="size-7"/>
        </span>) : null}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>);
}
