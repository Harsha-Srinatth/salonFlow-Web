import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Ban, Bell, CalendarCheck, CalendarClock, CheckCheck, Flag, Gift, Hourglass, MessageCircle, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatIsoDate, salonDateOf } from "@/lib/salon-date";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { fetchNotifications, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from "@/lib/notifications-api";
import { connectCustomerBookingsSocket, disconnectCustomerBookingsSocket } from "@/lib/realtime/admin-bookings-socket";
import { haptic, spring, stagger } from "@/components/motion/presets";
import { EmptyState, IconButton, ResponsiveModal, TONE_CLASSES } from "@/components/kit";
import { SkeletonList } from "@/components/motion/skeleton-shimmer";

const TYPE_META = {
  BOOKING_CONFIRMED: { icon: CalendarCheck, tone: "primary" },
  BOOKING_ASSIGNED: { icon: CalendarClock, tone: "primary" },
  BOOKING_CANCELLED: { icon: Ban, tone: "destructive" },
  BOOKING_CANCELLED_ADMIN: { icon: Ban, tone: "warning" },
  BOOKING_NO_SHOW: { icon: AlertTriangle, tone: "warning" },
  QUEUE_APPROACHING: { icon: Hourglass, tone: "info" },
  FEEDBACK_NEW: { icon: Star, tone: "gold" },
  FEEDBACK_COMPLAINT: { icon: Flag, tone: "destructive" },
  FEEDBACK_RESPONDED: { icon: MessageCircle, tone: "success" },
  REFERRAL_REWARDED: { icon: Gift, tone: "gold" },
  REFERRAL_PENDING: { icon: Hourglass, tone: "warning" },
  REFERRAL_REJECTED: { icon: Ban, tone: "warning" },
};

/** Same routing the shared NotificationBell uses for the customer portal. */
function linkFor(type = "") {
  if (type.startsWith("BOOKING") || type === "FEEDBACK_RESPONDED") return "/user-dashboard/booking-history";
  if (type === "QUEUE_APPROACHING") return "/user-dashboard/queue";
  if (type.startsWith("REFERRAL")) return "/user-dashboard/loyalty";
  return null;
}

function relativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d` : formatIsoDate(salonDateOf(iso), { day: "numeric", month: "short" });
}

/**
 * Notification state for the customer shell. Same endpoints and realtime event
 * (`notification.created.v1` on the customer bookings socket) as the shared NotificationBell; the
 * socket module is ref-counted, so this shares the connection the booking pages open.
 */
export function useCustomerNotifications(userId) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([fetchNotifications({ limit: 30 }), fetchUnreadNotificationCount()]);
      setItems(list);
      setUnread(count);
    } catch {
      // Convenience layer: a failed load never blocks the portal.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) void load();
  }, [userId, load]);

  useEffect(() => {
    if (!userId) return undefined;
    let mounted = true;
    void (async () => {
      const token = await getFirebaseIdToken().catch(() => null);
      await connectCustomerBookingsSocket({
        token,
        onNotificationCreated: (notification) => {
          if (!mounted) return;
          setItems((prev) => [notification, ...prev].slice(0, 50));
          setUnread((prev) => prev + 1);
          haptic("tap");
        },
      }).catch(() => undefined);
    })();
    return () => {
      mounted = false;
      disconnectCustomerBookingsSocket();
    };
  }, [userId]);

  const markRead = useCallback((n) => {
    if (n.read) return;
    setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
    setUnread((prev) => Math.max(0, prev - 1));
    markNotificationRead(n.id).catch(() => {});
  }, []);

  const markAll = useCallback(() => {
    setUnread(0);
    setItems((prev) => prev.map((it) => ({ ...it, read: true })));
    markAllNotificationsRead().catch(() => {});
  }, []);

  return { items, unread, loading, load, markRead, markAll };
}

/** Bell button + notification center (sheet on phones, dialog on desktop). */
export function NotificationCenter({ state }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { items, unread, loading, markRead, markAll } = state;

  const select = (n) => {
    markRead(n);
    const link = linkFor(n.type);
    if (link) {
      setOpen(false);
      navigate(link);
    }
  };

  return (
    <>
      <span className="relative">
        <IconButton icon={Bell} label={unread ? `Notifications, ${unread} unread` : "Notifications"} onClick={() => setOpen(true)} />
        <AnimatePresence>
          {unread ? (
            <motion.span
              key={unread}
              aria-hidden
              initial={reduce ? false : { scale: 0.3 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={spring.bouncy}
              className="pointer-events-none absolute top-1 right-1 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] leading-[18px] font-bold text-destructive-foreground ring-2 ring-background"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </span>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Notifications"
        icon={Bell}
        size="md"
        footer={
          items.length ? (
            <button type="button" disabled={!unread} onClick={markAll} className="inline-flex h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold text-portal hover:bg-portal/10 disabled:text-ink-neutral disabled:opacity-60">
              <CheckCheck className="size-4" aria-hidden /> Mark all read
            </button>
          ) : null
        }
      >
        {loading && !items.length ? (
          <SkeletonList rows={4} label="Loading notifications" />
        ) : !items.length ? (
          <EmptyState illustration="sparkle" title="All caught up" compact className="bg-transparent" />
        ) : (
          <motion.ul initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: stagger.tight } } }} className="-mx-2 space-y-1">
            {items.map((n) => {
              const meta = TYPE_META[n.type] ?? { icon: Bell, tone: "primary" };
              const Icon = meta.icon;
              return (
                <motion.li key={n.id} variants={{ hidden: { opacity: 0, x: reduce ? 0 : -10 }, show: { opacity: 1, x: 0, transition: spring.soft } }}>
                  <button
                    type="button"
                    onClick={() => select(n)}
                    className={cn("flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-muted", !n.read && "bg-portal/6")}
                  >
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset", TONE_CLASSES[meta.tone] ?? TONE_CLASSES.primary)}>
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className={cn("min-w-0 flex-1 truncate text-sm", n.read ? "font-medium" : "font-semibold")}>{n.title}</span>
                        <span className="shrink-0 text-micro text-ink-neutral">{relativeTime(n.createdAt)}</span>
                      </span>
                      {n.body ? <span className="mt-0.5 line-clamp-2 block text-caption text-ink-neutral">{n.body}</span> : null}
                    </span>
                    {!n.read ? <span className="mt-2 size-2 shrink-0 rounded-full bg-portal" aria-label="Unread" /> : null}
                  </button>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </ResponsiveModal>
    </>
  );
}
