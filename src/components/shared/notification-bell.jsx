"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFirebaseIdToken } from "@/lib/auth/id-token";
import { fetchStaffMe } from "@/lib/staff-auth-client";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications-api";
import {
  connectAdminBookingsSocket,
  connectCustomerBookingsSocket,
  connectReceptionBookingsSocket,
  connectStaffBookingsSocket,
  disconnectAdminBookingsSocket,
  disconnectCustomerBookingsSocket,
  disconnectReceptionBookingsSocket,
  disconnectStaffBookingsSocket,
} from "@/lib/realtime/admin-bookings-socket";
import { animate, stagger } from "animejs";
import {
  AlertTriangle,
  Ban,
  Bell,
  CalendarCheck,
  CalendarClock,
  Check,
  CheckCheck,
  Flag,
  Gift,
  Hourglass,
  Inbox,
  MessageCircle,
  Star,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const PORTAL_SOCKET = {
  admin: { connect: connectAdminBookingsSocket, disconnect: disconnectAdminBookingsSocket },
  reception: { connect: connectReceptionBookingsSocket, disconnect: disconnectReceptionBookingsSocket },
  customer: { connect: connectCustomerBookingsSocket, disconnect: disconnectCustomerBookingsSocket },
  staff: { connect: connectStaffBookingsSocket, disconnect: disconnectStaffBookingsSocket },
};

const TYPE_META = {
  BOOKING_CONFIRMED: { icon: CalendarCheck, tone: "primary" },
  BOOKING_ASSIGNED: { icon: CalendarClock, tone: "primary" },
  BOOKING_CANCELLED: { icon: Ban, tone: "destructive" },
  BOOKING_CANCELLED_ADMIN: { icon: Ban, tone: "warning" },
  BOOKING_NO_SHOW: { icon: AlertTriangle, tone: "warning" },
  QUEUE_APPROACHING: { icon: Hourglass, tone: "accent" },
  FEEDBACK_NEW: { icon: Star, tone: "accent" },
  FEEDBACK_COMPLAINT: { icon: Flag, tone: "destructive" },
  FEEDBACK_RESPONDED: { icon: MessageCircle, tone: "success" },
  REFERRAL_REWARDED: { icon: Gift, tone: "success" },
  REFERRAL_PENDING: { icon: Hourglass, tone: "warning" },
  REFERRAL_REJECTED: { icon: Ban, tone: "warning" },
};

const TONE_CLASSES = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

function resolveNotificationLink(notification, portal) {
  const type = notification?.type ?? "";
  if (portal === "customer" && (type.startsWith("BOOKING") || type === "FEEDBACK_RESPONDED")) {
    return "/user-dashboard/booking-history";
  }
  if (portal === "customer" && type === "QUEUE_APPROACHING") return "/user-dashboard/queue";
  if (portal === "customer" && type === "REFERRAL_REWARDED") return "/user-dashboard/loyalty";
  if (portal === "admin" && type.startsWith("FEEDBACK")) return "/admin-dashboard/feedback";
  if (portal === "admin" && type.startsWith("BOOKING")) return "/admin-dashboard/appointments";
  if (portal === "staff" && type === "BOOKING_ASSIGNED") return "/employee-dashboard/appointments";
  return null;
}

function formatRelativeTime(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

// Each portal layout mounts a bell in both its mobile and desktop header (only
// one is ever visible at a time, but both are live in the DOM). Without this,
// each instance fires its own initial fetch on mount — two network round-trips
// for what is, in effect, one bell. Concurrent mounts for the same user instead
// share one in-flight request; the cache entry clears once it settles so a
// later remount (e.g. re-login) always gets fresh data rather than a stale reuse.
const initialFetchCache = new Map();

function fetchInitialNotifications(key) {
  if (!initialFetchCache.has(key)) {
    const promise = Promise.all([fetchNotifications({ limit: 20 }), fetchUnreadNotificationCount()])
      .then(([list, count]) => ({ list, count }))
      .finally(() => {
        initialFetchCache.delete(key);
      });
    initialFetchCache.set(key, promise);
  }
  return initialFetchCache.get(key);
}

/**
 * Real-time, role-based notification center. Every portal (admin, reception,
 * staff, customer) mounts this once in its shared layout; it rides the same
 * already-open Socket.IO connection each portal establishes for booking
 * updates, so opening the panel never costs a second connection.
 */
export function NotificationBell({ portal, className }) {
  // Admin/customer share the global Firebase-backed AuthProvider context.
  // Reception/staff authenticate via a separate cookie session with no shared
  // context, so they're resolved independently through the same `fetchStaffMe`
  // call their own portal's session hook uses.
  const { appUser: firebaseAppUser } = useAuth();
  const usesStaffSession = portal === "reception" || portal === "staff";
  const [staffUser, setStaffUser] = useState(null);
  const currentUserId = usesStaffSession ? staffUser?.id : firebaseAppUser?.id;

  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const badgeRef = useRef(null);
  const panelRef = useRef(null);
  const rootRef = useRef(null);
  const socketApi = PORTAL_SOCKET[portal];

  useEffect(() => {
    if (!usesStaffSession) return;
    let mounted = true;
    void fetchStaffMe()
      .then((me) => {
        if (mounted) setStaffUser(me);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [usesStaffSession]);

  useEffect(() => {
    if (!currentUserId) return;
    let mounted = true;
    void fetchInitialNotifications(`${portal}:${currentUserId}`)
      .then(({ list, count }) => {
        if (!mounted) return;
        setNotifications(list);
        setUnreadCount(count);
      })
      .catch(() => {
        // Notifications are a convenience layer — a failed initial load shouldn't block the portal.
      });
    return () => {
      mounted = false;
    };
  }, [currentUserId, portal]);

  useEffect(() => {
    if (!currentUserId || !socketApi) return;
    let mounted = true;
    void (async () => {
      const token = await getFirebaseIdToken().catch(() => null);
      await socketApi.connect({
        token,
        onNotificationCreated: (notification) => {
          if (!mounted) return;
          setNotifications((prev) => [notification, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);
        },
      });
    })();
    return () => {
      mounted = false;
      socketApi.disconnect();
    };
  }, [currentUserId, socketApi]);

  useEffect(() => {
    if (!badgeRef.current || unreadCount === 0 || prefersReducedMotion()) return;
    animate(badgeRef.current, {
      scale: [0.4, 1.3, 1],
      duration: 460,
      ease: "outElastic(1, .6)",
    });
  }, [unreadCount]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    if (prefersReducedMotion()) return;
    animate(panelRef.current, {
      opacity: [0, 1],
      translateY: [-8, 0],
      scale: [0.97, 1],
      duration: 260,
      ease: "outQuart",
    });
    const rows = panelRef.current.querySelectorAll("[data-notification-row]");
    if (rows.length) {
      animate(rows, {
        opacity: [0, 1],
        translateX: [-10, 0],
        delay: stagger(35, { start: 80 }),
        duration: 320,
        ease: "outQuart",
      });
    }
  }, [open]);

  async function handleMarkAllRead() {
    if (!unreadCount) return;
    setUnreadCount(0);
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // Best-effort — a failed sync will self-correct next time the panel loads.
    }
  }

  async function handleSelectNotification(notification) {
    if (!notification.read) {
      setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      markNotificationRead(notification.id).catch(() => {});
    }
    const link = resolveNotificationLink(notification, portal);
    if (link) {
      setOpen(false);
      navigate(link);
    }
  }

  if (!currentUserId) return null;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        className="relative"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span
            ref={badgeRef}
            className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-[18px] text-destructive-foreground"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl sm:w-[380px]"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              disabled={!unreadCount}
              onClick={() => void handleMarkAllRead()}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary disabled:cursor-not-allowed disabled:text-muted-foreground/50"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {!notifications.length ? (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <Inbox className="size-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">You're all caught up</p>
                <p className="text-xs text-muted-foreground">Real-time updates will show up here.</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const meta = TYPE_META[notification.type] ?? { icon: Bell, tone: "primary" };
                const Icon = meta.icon;
                return (
                  <button
                    key={notification.id}
                    type="button"
                    data-notification-row
                    onClick={() => void handleSelectNotification(notification)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50",
                      !notification.read && "bg-primary/[0.03]"
                    )}
                  >
                    <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", TONE_CLASSES[meta.tone])}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("truncate text-sm", notification.read ? "font-medium text-foreground/90" : "font-semibold text-foreground")}>
                          {notification.title}
                        </span>
                        {!notification.read ? <span className="size-1.5 shrink-0 rounded-full bg-accent" /> : null}
                      </span>
                      {notification.body ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{notification.body}</span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-muted-foreground/70">{formatRelativeTime(notification.createdAt)}</span>
                    </span>
                    {notification.read ? <Check className="mt-1 size-3.5 shrink-0 text-muted-foreground/40" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
