"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className, compact = false }) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center",
                compact ? "gap-1.5 p-6" : "gap-2 p-10",
                className
            )}
        >
            {Icon ? (
                <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-5" />
                </span>
            ) : null}
            <p className="text-sm font-semibold">{title}</p>
            {description ? <p className="max-w-sm text-xs text-muted-foreground">{description}</p> : null}
            {actionLabel ? (
                <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onAction}>
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
}
