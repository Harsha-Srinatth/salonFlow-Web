import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZES = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-14 text-lg", xl: "size-20 text-2xl" };
const STATUS = { online: "bg-success", busy: "bg-destructive", away: "bg-warning", offline: "bg-muted-foreground" };

function hue(name) {
  let h = 0;
  for (const ch of `${name ?? ""}`) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
export function initials(name) {
  const parts = `${name ?? ""}`.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * Photo with a graceful initials fallback (stable gradient per name) and optional status dot.
 * @param {{ name?: string, src?: string, size?: keyof SIZES, status?: keyof STATUS, ring?: boolean }} props
 */
export function Avatar({ name, src, size = "md", status, ring = false, className }) {
  const [broken, setBroken] = useState(false);
  const h = hue(name);
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center rounded-full font-semibold text-white", SIZES[size] ?? SIZES.md, ring && "ring-2 ring-background", className)}>
      {src && !broken ? (
        <img src={src} alt={name ?? ""} loading="lazy" decoding="async" onError={() => setBroken(true)} className="size-full rounded-full object-cover" />
      ) : (
        <span aria-label={name} role="img" className="grid size-full place-items-center rounded-full" style={{ background: `hsl(${h} 30% 40%)` }}>
          {initials(name)}
        </span>
      )}
      {status ? <span aria-label={status} className={cn("absolute bottom-0 right-0 size-[28%] min-h-2 min-w-2 rounded-full ring-2 ring-background", STATUS[status])} /> : null}
    </span>
  );
}

/** Overlapping avatars with a +N counter. */
export function AvatarGroup({ people = [], max = 4, size = "sm", className }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className={cn("flex -space-x-2", className)}>
      {shown.map((p, i) => (
        <Avatar key={p.id ?? `${p.name}-${i}`} name={p.name} src={p.src} size={size} ring />
      ))}
      {extra > 0 ? <span className={cn("relative grid place-items-center rounded-full bg-muted font-semibold text-ink-neutral ring-2 ring-background", SIZES[size])}>+{extra}</span> : null}
    </span>
  );
}
