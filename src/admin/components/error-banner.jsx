"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Persistent inline error surface to pair with toast notifications —
 * toasts disappear, this stays visible until the underlying error clears
 * or the user retries.
 */
export function ErrorBanner({ message, onRetry, className }) {
    if (!message) return null;
    return (
        <div
            role="alert"
            className={cn(
                "flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between",
                className
            )}
        >
            <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span className="leading-snug">{message}</span>
            </div>
            {onRetry ? (
                <Button type="button" size="sm" variant="outline" className="w-fit gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={onRetry}>
                    <RotateCw className="size-3.5" />
                    Retry
                </Button>
            ) : null}
        </div>
    );
}
