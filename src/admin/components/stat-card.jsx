"use client";
import { cn } from "@/lib/utils";
import { useCountUp, useEntrance } from "@/admin/lib/motion";
import Counter from "@/components/fx/counter";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/**
 * Animated KPI tile used across admin overview sections.
 * `value` should be numeric for the count-up animation; pass `display`
 * to override the rendered text (e.g. currency-formatted strings).
 */
export function StatCard({ icon: Icon, label, value, display, trend, trendLabel, tone = "primary", delay = 0, className }) {
    const countRef = useCountUp(typeof value === "number" ? value : Number(value) || 0);
    const cardRef = useEntrance({ delay, distance: 12 });
    const toneClasses = {
        primary: "bg-primary/10 text-primary",
        accent: "bg-accent/15 text-accent",
        success: "bg-success/10 text-success",
        destructive: "bg-destructive/10 text-destructive",
        neutral: "bg-secondary text-secondary-foreground",
    };
    // Whole numbers below ten million roll like an odometer; anything else keeps the plain count-up.
    const odometer = display == null && typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 1e7;
    const isPositive = typeof trend === "number" ? trend >= 0 : undefined;
    return (
        <div
            ref={cardRef}
            className={cn(
                "admin-card-hover admin-shadow-sm relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 sm:p-5",
                className
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight sm:text-[26px]">
                        {display ?? (odometer ? <Counter value={Math.round(value)} fontSize={26} padding={4} gap={0} horizontalPadding={0} fontWeight={700} gradientHeight={0} gradientFrom="transparent" /> : <span ref={countRef}>0</span>)}
                    </p>
                </div>
                {Icon ? (
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", toneClasses[tone])}>
                        <Icon className="size-5" />
                    </span>
                ) : null}
            </div>
            {trend !== undefined || trendLabel ? (
                <div className="mt-3 flex items-center gap-1.5 text-xs">
                    {typeof trend === "number" ? (
                        <span
                            className={cn(
                                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
                                isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                            )}
                        >
                            {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                            {Math.abs(trend)}%
                        </span>
                    ) : null}
                    {trendLabel ? <span className="text-muted-foreground">{trendLabel}</span> : null}
                </div>
            ) : null}
        </div>
    );
}
