"use client";
import { cn } from "@/lib/utils";

export function Skeleton({ className }) {
    return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function SkeletonRows({ count = 3, className }) {
    return (
        <div className={cn("space-y-2.5", className)}>
            {Array.from({ length: count }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
        </div>
    );
}

export function SkeletonCards({ count = 3, className }) {
    return (
        <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
            {Array.from({ length: count }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-2xl" />
            ))}
        </div>
    );
}
