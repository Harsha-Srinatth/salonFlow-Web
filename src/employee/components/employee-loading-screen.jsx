"use client";

export function EmployeeLoadingScreen({ message = "Loading your shift…" }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <div className="mx-auto size-12 animate-pulse rounded-full bg-muted" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
