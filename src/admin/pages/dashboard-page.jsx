"use client";
import { selectAppointmentsList } from "@/admin/lib/selectors";
import { motion, useReducedMotion } from "motion/react";
import { Activity, ArrowRight, BarChart3, CalendarCheck, CalendarClock, CheckCircle2, Circle, Clock, Crown, Gift, IndianRupee, ListChecks, MessageSquareHeart, Plus, Radio, Scissors, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { AvatarGroup, ProgressRing, StatCard, StatusChip } from "@/components/kit";
import { SkeletonList, interaction, spring, stagger } from "@/components/motion";
import { AdminBarChart } from "@/components/kit-extra/admin-bar-chart";
import { ActivityFeed } from "@/admin/components/activity-feed";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { LiveRevenueCard } from "@/admin/components/live-revenue-card";
import { Panel } from "@/admin/components/panel";
import { useLiveRevenue } from "@/admin/lib/use-live-revenue";
import { timeOf } from "@/admin/lib/safe-format";
import { apiJson } from "@/lib/api-json";
import { formatMoney } from "@/lib/format";
import { notify } from "@/lib/notify";
import { formatIsoDate, salonDateIso, salonDateOf, salonHour } from "@/lib/salon-date";
import { cn } from "@/lib/utils";
import { fetchAdminBookings } from "@/store/admin-portal-slice";
import { fetchAdminDashboardData } from "@/store/admin-dashboard-slice";
import { AdminLayout } from "../portal/admin-layout";

const QUICK_LINKS = [
  { href: "/admin-dashboard/services?new=1", label: "Add service", icon: Plus },
  { href: "/admin-dashboard/staff/new", label: "Add staff", icon: UserPlus },
  { href: "/admin-dashboard/offers?new=1", label: "New offer", icon: Gift },
  { href: "/admin-dashboard/reports", label: "Revenue", icon: BarChart3 },
  { href: "/admin-dashboard/membership", label: "Plans", icon: Crown },
  { href: "/admin-dashboard/feedback", label: "Feedback", icon: MessageSquareHeart },
];

function greeting(hour) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const validInstant = (b) => b?.startsAt && !Number.isNaN(new Date(b.startsAt).getTime());
const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`;
const hourTick = (h) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;

/** Cumulative series (for sparklines): running total at each step. */
const cumulative = (values) => values.reduce((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);

export default function AdminDashboardPage() {
  const reduce = useReducedMotion();
  const { appUser } = useAuth();
  const dispatch = useDispatch();
  const { staff, salons, servicesCatalog, loading, error } = useSelector((state) => state.adminDashboard);
  const appointments = useSelector(selectAppointmentsList);
  const { appointmentsLoading } = useSelector((state) => state.adminPortal);
  const [missingProfile, setMissingProfile] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const live = useLiveRevenue();
  const isAdmin = appUser?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) return;
    void dispatch(fetchAdminDashboardData());
    void dispatch(fetchAdminBookings({ limit: 100, offset: 0, sort: "proximity" }));
    apiJson("/api/admin/business-profile", { auth: true })
      .then((data) => setMissingProfile(data.missingFields ?? []))
      .catch(() => setMissingProfile(null));
  }, [dispatch, isAdmin]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);

  const todayIso = salonDateIso(0, now);
  const today = useMemo(() => appointments.filter((b) => validInstant(b) && salonDateOf(b.startsAt) === todayIso && b.status !== "CANCELLED"), [appointments, todayIso]);
  const inService = today.filter((b) => b.status === "STARTED").length;
  const completed = today.filter((b) => b.status === "COMPLETED").length;
  const upNext = useMemo(
    () =>
      today
        .filter((b) => b.status === "PENDING" || b.status === "CONFIRMED")
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
        .slice(0, 5),
    [today]
  );

  // Today's bookings per hour (salon time), across the hours that actually have bookings ±1.
  const byHour = useMemo(() => {
    if (!today.length) return [];
    const counts = new Map();
    for (const b of today) counts.set(salonHour(b.startsAt), (counts.get(salonHour(b.startsAt)) ?? 0) + 1);
    const hours = [...counts.keys()];
    const from = Math.max(0, Math.min(...hours, 9) - 1);
    const to = Math.min(23, Math.max(...hours, 18) + 1);
    const nowHour = salonHour(now.toISOString());
    return Array.from({ length: to - from + 1 }, (_, i) => {
      const h = from + i;
      return { key: `${h}`, label: hourLabel(h), tick: hourTick(h), value: counts.get(h) ?? 0, current: h === nowHour };
    });
  }, [today, now]);
  const peakCount = Math.max(0, ...byHour.map((d) => d.value));
  const byHourData = byHour.map((d) => ({ ...d, highlight: d.value > 0 && d.value === peakCount }));

  const revenueTrend = useMemo(() => (live.feed?.today ?? []).map((p) => Number(p.value) || 0), [live.feed]);
  const bookingTrend = useMemo(() => cumulative(byHour.map((d) => d.value)), [byHour]);

  const activeStylists = staff.filter((s) => s.role === "STAFF" && s.isActive);
  const stylistsWithoutServices = activeStylists.filter((s) => !(s.allowedServiceIds ?? []).length).length;
  const pendingSetup = staff.filter((s) => s.accountStatus !== "ACTIVE").length;

  const checklist = [
    { done: missingProfile ? missingProfile.length === 0 : null, label: "Business profile", hint: missingProfile?.length ? `${missingProfile.length} detail${missingProfile.length === 1 ? "" : "s"} missing` : "", href: "/admin-dashboard/settings" },
    { done: salons.length > 0, label: "Salon location", hint: "Add it in Settings", href: "/admin-dashboard/settings?section=salons" },
    { done: servicesCatalog.length > 0, label: "Services on the menu", hint: "Add your first service", href: "/admin-dashboard/services?new=1" },
    { done: activeStylists.length > 0 && stylistsWithoutServices === 0, label: "Stylists bookable", hint: stylistsWithoutServices ? `${stylistsWithoutServices} without services` : "Create a stylist first", href: "/admin-dashboard/staff/permissions" },
    { done: staff.length > 0 && pendingSetup === 0, label: "Team verified", hint: pendingSetup ? `${pendingSetup} finishing setup` : "Create your team", href: "/admin-dashboard/staff" },
  ].filter((item) => item.done !== null);
  const remaining = checklist.filter((item) => !item.done);
  const setupPercent = checklist.length ? Math.round(((checklist.length - remaining.length) / checklist.length) * 100) : 100;

  if (!appUser || !isAdmin) {
    return (
      <AdminLayout pageTitle="Dashboard">
        <EmptyState illustration="search" title={appUser ? "Admins only" : "Please sign in"} description={appUser ? "This account doesn't have admin access." : undefined} />
      </AdminLayout>
    );
  }

  const firstName = appUser?.name?.split(" ")[0];
  const loadingToday = appointmentsLoading && !appointments.length;

  return (
    <AdminLayout pageTitle="Dashboard" description={formatIsoDate(todayIso, { weekday: "long", day: "numeric", month: "long" })}>
      <div className="space-y-5 md:space-y-6">
        <ErrorBanner message={error} onRetry={() => dispatch(fetchAdminDashboardData()).unwrap()} />

        {/* Hero: greeting, one-line summary, today's progress ring */}
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
          className="admin-hero-surface relative overflow-hidden rounded-sheet p-5 text-white shadow-lift sm:p-7"
        >
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="font-display text-title leading-tight font-semibold sm:text-display-lg">
                {greeting(salonHour(now.toISOString()))}
                {firstName ? `, ${firstName}` : ""}
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2 text-caption font-semibold">
                <li className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3">
                  <CalendarCheck className="size-3.5" aria-hidden /> {today.length} today
                </li>
                {inService ? (
                  <li className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3">
                    <Scissors className="size-3.5" aria-hidden /> {inService} in service
                  </li>
                ) : null}
                {upNext[0] ? (
                  <li className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3">
                    <Clock className="size-3.5" aria-hidden /> Next {timeOf(upNext[0].startsAt)}
                  </li>
                ) : null}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/admin-dashboard/appointments" className="inline-flex h-11 items-center gap-2 rounded-control bg-card px-4 text-sm font-semibold text-foreground shadow-soft transition-transform active:scale-[0.97]">
                  <CalendarClock className="size-4" aria-hidden /> Bookings
                </Link>
                <Link to="/admin-dashboard/staff/live-monitor" className="inline-flex h-11 items-center gap-2 rounded-control bg-white/12 px-4 text-sm font-semibold ring-1 ring-inset ring-white/25 transition-transform active:scale-[0.97]">
                  <Radio className="size-4" aria-hidden /> Live floor
                </Link>
              </div>
            </div>
            <div className="hidden shrink-0 rounded-full bg-card p-1.5 text-foreground shadow-lift min-[400px]:block">
              <ProgressRing value={completed} max={Math.max(1, today.length)} size={104} tone="portal" label="Completed today" showValue={false}>
                <span className="text-center leading-tight">
                  <span className="block font-display text-2xl font-bold tabular-nums">
                    {completed}/{today.length}
                  </span>
                  <span className="block text-[11px] font-semibold text-ink-neutral">done</span>
                </span>
              </ProgressRing>
            </div>
          </div>
        </motion.section>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard icon={CalendarCheck} label="Bookings today" value={today.length} trend={bookingTrend} tone="primary" loading={loadingToday} />
          <StatCard icon={Activity} label="In service" value={inService} tone="info" loading={loadingToday} />
          <StatCard icon={CheckCircle2} label="Completed" value={completed} tone="success" loading={loadingToday} />
          <StatCard icon={IndianRupee} label="Net revenue today" value={Number(live.feed?.todayTotal ?? 0)} format={(n) => formatMoney(n)} trend={revenueTrend} tone="primary" loading={!live.feed && !live.error} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-5">
            <LiveRevenueCard feed={live.feed} error={live.error} skew={live.skew} onRetry={live.reload} />

            <Panel title="Bookings by hour" icon={BarChart3} subtitle="Today, salon time">
              {loadingToday ? (
                <SkeletonList rows={2} />
              ) : byHourData.length ? (
                <AdminBarChart data={byHourData} format={(n) => `${n} booking${n === 1 ? "" : "s"}`} height={170} ariaLabel="Today's bookings by hour" />
              ) : (
                <EmptyState compact illustration="calendar" title="No bookings today" className="bg-transparent" />
              )}
            </Panel>
          </div>

          <div className="min-w-0 space-y-5">
            <Panel
              title="Up next"
              icon={ListChecks}
              subtitle={inService ? `${inService} in service now` : "Today's queue"}
              bodyClassName="p-2 sm:p-3"
              action={
                <Link to="/admin-dashboard/appointments" className="tap inline-flex items-center gap-1 text-caption font-semibold text-portal hover:underline">
                  All <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              }
            >
              {loadingToday ? (
                <SkeletonList rows={3} className="p-2" />
              ) : !upNext.length ? (
                <EmptyState compact illustration="queue" title={today.length ? "All caught up" : "No bookings today"} className="bg-transparent" />
              ) : (
                <ul className="space-y-1">
                  {upNext.map((booking, index) => {
                    const late = new Date(booking.startsAt).getTime() < now.getTime() - 5 * 60_000;
                    return (
                      <motion.li
                        key={booking.id}
                        initial={reduce ? false : { opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...spring.soft, delay: index * stagger.base }}
                      >
                        <Link to={`/admin-dashboard/appointments?q=${encodeURIComponent(booking.customer ?? "")}&booking=${encodeURIComponent(booking.id)}`} className="flex min-h-14 items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-muted/60">
                          <span className={cn("w-16 shrink-0 text-center font-display text-sm font-bold tabular-nums", late ? "text-ink-warning" : "text-foreground")}>
                            {timeOf(booking.startsAt)}
                            {late ? <span className="block text-[10px] font-semibold">Late</span> : null}
                          </span>
                          <AvatarBadge name={booking.customer} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{booking.customer}</span>
                            <span className="block truncate text-caption text-ink-neutral">
                              {booking.service}
                              {booking.stylistName ? ` · ${booking.stylistName}` : ""}
                            </span>
                          </span>
                          <StatusChip status={booking.status} booking={booking} size="sm" iconOnly className="sm:hidden" />
                          <StatusChip status={booking.status} booking={booking} size="sm" className="hidden sm:inline-flex" />
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel title="Live activity" icon={Radio} bodyClassName="px-3 py-2 sm:px-4">
              <ActivityFeed bookings={appointments} today={today} />
            </Panel>

            {remaining.length ? (
              <Panel title="Finish setup" icon={ListChecks} action={<span className="text-caption font-bold text-portal tabular-nums">{setupPercent}%</span>} bodyClassName="p-2">
                <ul>
                  {checklist.map((item) => (
                    <li key={item.label}>
                      <Link to={item.href} className="group flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-colors hover:bg-muted/60">
                        {item.done ? <CheckCircle2 className="size-[18px] shrink-0 text-ink-success" aria-hidden /> : <Circle className="size-[18px] shrink-0 text-ink-neutral" aria-hidden />}
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate font-semibold", item.done && "text-ink-neutral line-through")}>{item.label}</span>
                          {!item.done && item.hint ? <span className="block truncate text-caption text-ink-neutral">{item.hint}</span> : null}
                        </span>
                        {!item.done ? <ArrowRight className="size-4 shrink-0 text-ink-neutral transition-transform group-hover:translate-x-0.5" aria-hidden /> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}

            <Panel title="Team" icon={Users} subtitle={staff.length ? `${staff.length} members${pendingSetup ? ` · ${pendingSetup} pending` : ""}` : loading ? "Loading…" : "No one yet"}>
              <div className="flex items-center justify-between gap-3">
                {staff.length ? <AvatarGroup people={staff.map((m) => ({ name: m.name }))} max={5} /> : <span className="text-caption text-ink-neutral">Add your first teammate</span>}
                <Link to="/admin-dashboard/staff" className="inline-flex h-11 items-center gap-1.5 rounded-control px-3 text-sm font-semibold text-portal hover:bg-portal/10">
                  Open <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </Panel>

            <Panel title="Quick actions" bodyClassName="grid grid-cols-3 gap-2 p-3">
              {QUICK_LINKS.map((link) => (
                <motion.div key={link.href} whileHover={reduce ? undefined : interaction.cardHover} whileTap={reduce ? undefined : interaction.press}>
                  <Link to={link.href} className="flex h-full flex-col items-center gap-2 rounded-2xl p-3 text-center text-caption font-semibold ring-1 ring-inset ring-border/60 transition-colors hover:bg-portal/8 hover:ring-portal/30">
                    <span className="grid size-10 place-items-center rounded-xl bg-portal/12 text-portal">
                      <link.icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="line-clamp-1">{link.label}</span>
                  </Link>
                </motion.div>
              ))}
            </Panel>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
