import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { salonTimeLabel } from "@/lib/salon-date";

export function durationLabel(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * One line above the time picker saying how long the whole booking takes and the latest time it
 * can start before closing, so a missing late slot is never a mystery. `info` is the slots API
 * payload minus `slots` ({ totalDuration, hours: { closesAt }, lastStartAt }).
 */
export function SlotDayHint({ info, className }) {
  const minutes = Number(info?.totalDuration ?? 0);
  if (!minutes || !info?.hours?.closesAt) return null;
  return (
    <p className={cn("flex items-start gap-2 rounded-xl bg-muted px-3 py-2 text-caption text-foreground", className)}>
      <Clock className="mt-0.5 size-3.5 shrink-0 text-ink-info" aria-hidden />
      <span>
        Takes <b className="font-semibold">{durationLabel(minutes)}</b>. Closes {salonTimeLabel(info.hours.closesAt)}
        {info.lastStartAt ? (
          <>
            , so the last start is <b className="font-semibold">{salonTimeLabel(info.lastStartAt)}</b>
          </>
        ) : null}
        .
      </span>
    </p>
  );
}

/**
 * Why a picked time is no longer offered: after adding services it can run past closing, which is
 * a different fix (earlier time, fewer services) from someone else taking it.
 */
export function staleSlotReason(startsAt, info) {
  if (startsAt && info?.lastStartAt && new Date(startsAt).getTime() > new Date(info.lastStartAt).getTime()) {
    return `With ${durationLabel(info.totalDuration)} of services, that time runs past closing. Pick ${salonTimeLabel(info.lastStartAt)} or earlier`;
  }
  return "That time was just taken. Pick another";
}
