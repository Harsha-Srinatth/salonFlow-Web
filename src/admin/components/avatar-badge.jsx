"use client";
import { cn } from "@/lib/utils";

const PALETTE = [
    "bg-primary/15 text-primary",
    "bg-accent/15 text-accent",
    "bg-chart-3/15 text-chart-3",
    "bg-chart-4/15 text-chart-4",
    "bg-chart-5/15 text-chart-5",
];

function hashToIndex(source) {
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
        hash = (hash * 31 + source.charCodeAt(i)) % PALETTE.length;
    }
    return Math.abs(hash);
}

export function AvatarBadge({ name, size = "md", className }) {
    const label = (name || "?").trim();
    const initials = label
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "?";
    const sizeClasses = {
        sm: "size-7 text-[10px]",
        md: "size-9 text-xs",
        lg: "size-11 text-sm",
    };
    return (
        <span
            className={cn(
                "flex shrink-0 items-center justify-center rounded-full font-semibold",
                sizeClasses[size],
                PALETTE[hashToIndex(label)],
                className
            )}
        >
            {initials}
        </span>
    );
}
