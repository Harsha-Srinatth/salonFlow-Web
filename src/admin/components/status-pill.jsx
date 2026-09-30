"use client";
import { cn } from "@/lib/utils";

/**
 * Semantic color mapping for the statuses that recur across the admin
 * portal (bookings, offers, staff availability, payments). Centralising
 * this keeps colors consistent without touching any business logic.
 */
const TONE_CLASSES = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/25",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    primary: "bg-primary/10 text-primary border-primary/20",
    accent: "bg-accent/10 text-accent border-accent/25",
    neutral: "bg-muted text-muted-foreground border-border",
};

const STATUS_TONE = {
    ACTIVE: "success",
    COMPLETED: "success",
    CONNECTED: "success",
    ENABLED: "success",
    "ON TRACK": "success",
    STARTED: "warning",
    PENDING: "warning",
    "RED ZONE": "warning",
    CANCELLED: "destructive",
    CRITICAL: "destructive",
    "NO-SHOW": "warning",
    "CLIENT DID NOT VISIT": "warning",
    DISABLED: "destructive",
    DISCONNECTED: "destructive",
    INACTIVE: "neutral",
    EXPIRED: "neutral",
    OPEN: "warning",
    REVIEWED: "primary",
    RESOLVED: "success",
    COMPLAINT: "destructive",
    FEEDBACK: "accent",
    REWARDED: "success",
    FIRST_ACTION_DONE: "primary",
    COOLING: "primary",
    APPROVED: "primary",
    REJECTED: "destructive",
    "NEEDS REVIEW": "warning",
};

export function StatusPill({ status, tone, className, dot = false }) {
    const key = `${status ?? ""}`.trim().toUpperCase();
    const resolvedTone = tone ?? STATUS_TONE[key] ?? "neutral";
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none",
                TONE_CLASSES[resolvedTone],
                className
            )}
        >
            {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
            {status}
        </span>
    );
}
