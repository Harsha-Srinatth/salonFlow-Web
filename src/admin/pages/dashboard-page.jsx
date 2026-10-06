"use client";
import { AnimatePresence, motion } from "motion/react";
import { Activity, ArrowRight, BarChart3, Building2, Calendar, CalendarCheck, CheckCircle2, Circle, Clock, Crown, Gift, MessageSquareHeart, Plus, Scissors, Sparkles, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "@/lib/notify";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { LiveRevenueCard } from "@/admin/components/live-revenue-card";
import { StatCard } from "@/admin/components/stat-card";
import { StatusPill } from "@/admin/components/status-pill";
import { apiJson } from "@/lib/api-json";
import { getBookingDisplayStatus } from "@/lib/booking-pending-status";
import { cn } from "@/lib/utils";
import { fetchAdminBookings, selectAdminAppointments } from "@/store/admin-portal-slice";
import { fetchAdminDashboardData } from "@/store/admin-dashboard-slice";
import { AdminLayout } from "../portal/admin-layout";

const QUICK_LINKS = [
  { href: "/admin-dashboard/appointments", label: "Bookings", icon: Calendar },
  { href: "/admin-dashboard/services", label: "Services", icon: Scissors },
  { href: "/admin-dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin-dashboard/offers", label: "Offers", icon: Gift },
  { href: "/admin-dashboard/membership", label: "Membership", icon: Crown },
  { href: "/admin-dashboard/feedback", label: "Feedback", icon: MessageSquareHeart },
];

function greeting(hour) {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const timeOf = (value) => new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const fadeUp = (delay = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay, type: "spring", stiffness: 260, damping: 28 } });

function Panel({ title, icon: Icon, action, children, className, delay = 0 }) {
  return (
    <motion.section {...fadeUp(delay)} className={cn("admin-shadow-sm overflow-hidden rounded-2xl border border-border/70 bg-card", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
        <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold">
          {Icon ? <Icon className="size-4 text-primary" /> : null}
          {title}
        </h2>
        {action}
      </header>
      {children}
    </motion.section>
  );
}

export default function AdminDashboardPage() {
  const { appUser } = useAuth();
  const dispatch = useDispatch();
  const { staff, salons, servicesCatalog, loading, error } = useSelector((state) => state.adminDashboard);
  const appointments = useSelector(selectAdminAppointments);
  const { appointmentsLoading } = useSelector((state) => state.adminPortal);
  const [missingProfile, setMissingProfile] = useState(null);
  const [now, setNow] = useState(() => new Date());
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
    if (error) toast.error(error);
  }, [error]);

  const today = useMemo(() => appointments.filter((b) => b.startsAt && sameDay(new Date(b.startsAt), now) && b.status !== "CANCELLED"), [appointments, now]);
  const inProgress = today.filter((b) => b.status === "STARTED").length;
  const completed = today.filter((b) => b.status === "COMPLETED").length;
  const upNext = useMemo(
    () =>
      today
        .filter((b) => b.status === "PENDING" || b.status === "CONFIRMED")
        .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
        .slice(0, 5),
    [today]
  );
  const progress = today.length ? Math.round((completed / today.length) * 100) : 0;

  const activeStylists = staff.filter((s) => s.role === "STAFF" && s.isActive);
  const stylistsWithoutServices = activeStylists.filter((s) => !(s.allowedServiceIds ?? []).length).length;
  const pendingSetup = staff.filter((s) => s.accountStatus !== "ACTIVE").length;

  const checklist = [
    { done: missingProfile ? missingProfile.length === 0 : null, label: "Business profile is complete", hint: missingProfile?.length ? `${missingProfile.length} detail${missingProfile.length === 1 ? "" : "s"} missing` : "", href: "/admin-dashboard/settings" },
    { done: salons.length > 0, label: "Salon location added", hint: "Add it in Settings", href: "/admin-dashboard/settings" },
    { done: servicesCatalog.length > 0, label: "Services are on the menu", hint: "Add your first service", href: "/admin-dashboard/services" },
    { done: activeStylists.length > 0 && stylistsWithoutServices === 0, label: "Every stylist has services", hint: stylistsWithoutServices ? `${stylistsWithoutServices} stylist${stylistsWithoutServices === 1 ? "" : "s"} can't be booked yet` : "Create a stylist first", href: "/admin-dashboard/staff/permissions" },
    { done: staff.length > 0 && pendingSetup === 0, label: "Team accounts are verified", hint: pendingSetup ? `${pendingSetup} waiting to finish setup` : "Create your team", href: "/admin-dashboard/staff" },
  ].filter((item) => item.done !== null);
  const remaining = checklist.filter((item) => !item.done);
  const setupPercent = checklist.length ? Math.round(((checklist.length - remaining.length) / checklist.length) * 100) : 100;

  if (!appUser) return <div className="p-4">Please sign in first.</div>;
  if (!isAdmin) return <div className="p-4">You do not have admin access.</div>;

  const firstName = appUser?.name?.split(" ")[0];
  const dateLabel = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });

  return (
    <AdminLayout
      pageTitle="Dashboard"
      description="Your salon at a glance."
    >
      <div className="space-y-5 md:space-y-6">
        <ErrorBanner message={error} onRetry={() => void dispatch(fetchAdminDashboardData())} />

        {/* Hero */}
        <motion.section {...fadeUp()} className="admin-hero-surface admin-noise-veil relative overflow-hidden rounded-3xl p-5 text-primary-foreground sm:p-7">
          <motion.span aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-3xl" animate={{ x: [0, -24, 0], y: [0, 14, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
          <motion.span aria-hidden className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full bg-accent/25 blur-3xl" animate={{ x: [0, 30, 0], y: [0, -10, 0] }} transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }} />
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium opacity-80">{dateLabel}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-4xl">
                {greeting(now.getHours())}
                {firstName ? `, ${firstName}` : ""}
              </h2>
              <p className="mt-2 max-w-xl text-sm opacity-85 sm:text-base">
                {today.length ? (
                  <>
                    <span className="font-semibold">{today.length}</span> booking{today.length === 1 ? "" : "s"} today
                    {inProgress ? <>, <span className="font-semibold">{inProgress}</span> in progress now</> : null}
                    {upNext.length ? <>. Next up at <span className="font-semibold">{timeOf(upNext[0].startsAt)}</span>.</> : "."}
                  </>
                ) : appointmentsLoading ? (
                  "Loading today's schedule…"
                ) : (
                  "No bookings on the schedule today yet."
                )}
              </p>
              {salons[0] ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                  <Building2 className="size-3.5" /> {salons[0].name}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="bg-white/95 text-foreground hover:bg-white">
                <Link to="/admin-dashboard/appointments">
                  <CalendarCheck className="size-4" /> View bookings
                </Link>
              </Button>
              <Button asChild variant="ghost" className="bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">
                <Link to="/admin-dashboard/services">
                  <Plus className="size-4" /> Add service
                </Link>
              </Button>
            </div>
          </div>
        </motion.section>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          <StatCard icon={CalendarCheck} label="Bookings today" value={today.length} tone="primary" />
          <StatCard icon={Activity} label="In progress" value={inProgress} tone="accent" delay={60} trendLabel={inProgress ? "On the floor now" : "Nothing running"} />
          <StatCard icon={CheckCircle2} label="Completed today" value={completed} tone="success" delay={120} trendLabel={today.length ? `${progress}% of today` : undefined} />
          <StatCard icon={Users} label="Active stylists" value={activeStylists.length} tone="neutral" delay={180} trendLabel={stylistsWithoutServices ? `${stylistsWithoutServices} need services` : "All bookable"} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
            <LiveRevenueCard />

            <Panel
              title="Up next today"
              icon={Clock}
              delay={0.1}
              action={
                <Link to="/admin-dashboard/appointments" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  All bookings <ArrowRight className="size-3.5" />
                </Link>
              }
            >
              <div className="p-3 sm:p-4">
                {!upNext.length ? (
                  <EmptyState compact icon={Calendar} title={today.length ? "Nothing left to start" : "No bookings today"} description={today.length ? "Every booking today has started or finished." : "New bookings will show up here as customers schedule."} />
                ) : (
                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {upNext.map((booking, index) => {
                        const late = new Date(booking.startsAt).getTime() < now.getTime() - 5 * 60_000;
                        return (
                          <motion.li key={booking.id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: index * 0.04 }} className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/40">
                            <div className="w-16 shrink-0 text-center">
                              <p className={cn("text-sm font-bold tabular-nums", late && "text-warning")}>{timeOf(booking.startsAt)}</p>
                              {late ? <p className="text-[10px] font-medium text-warning">Running late</p> : null}
                            </div>
                            <AvatarBadge name={booking.customer} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{booking.customer}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {booking.service}
                                {booking.stylistName ? ` · ${booking.stylistName}` : ""}
                              </p>
                            </div>
                            <StatusPill status={getBookingDisplayStatus(booking)} className="hidden sm:inline-flex" />
                          </motion.li>
                        );
                      })}
                    </AnimatePresence>
                  </ul>
                )}
              </div>
            </Panel>
          </div>

          <div className="min-w-0 space-y-5">
            {/* Setup checklist: only while something is left to do */}
            <AnimatePresence initial={false}>
              {remaining.length ? (
                <Panel
                  title="Finish setting up"
                  icon={Sparkles}
                  delay={0.12}
                  action={<span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{setupPercent}%</span>}
                >
                  <div className="h-1 bg-muted">
                    <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${setupPercent}%` }} transition={{ type: "spring", stiffness: 90, damping: 20 }} />
                  </div>
                  <ul className="divide-y divide-border/60">
                    {checklist.map((item) => (
                      <li key={item.label}>
                        <Link to={item.href} className="group flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40 sm:px-5">
                          {item.done ? <CheckCircle2 className="size-[18px] shrink-0 text-success" /> : <Circle className="size-[18px] shrink-0 text-muted-foreground/60" />}
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate font-medium", item.done && "text-muted-foreground line-through")}>{item.label}</span>
                            {!item.done && item.hint ? <span className="block truncate text-xs text-muted-foreground">{item.hint}</span> : null}
                          </span>
                          {!item.done ? <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Panel>
              ) : null}
            </AnimatePresence>

            {/* Team: a pointer to the dedicated page, not the list itself */}
            <Panel title="Your team" icon={Users} delay={0.16}>
              <div className="space-y-4 p-4 sm:p-5">
                {staff.length ? (
                  <div className="flex items-center">
                    <div className="flex -space-x-2">
                      {staff.slice(0, 5).map((member) => (
                        <AvatarBadge key={member.id} name={member.name} className="ring-2 ring-card" />
                      ))}
                    </div>
                    <p className="ml-3 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{staff.length}</span> member{staff.length === 1 ? "" : "s"}
                      {pendingSetup ? <span className="text-warning"> · {pendingSetup} pending setup</span> : null}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{loading ? "Loading your team…" : "No one has been added yet."}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button asChild className="flex-1">
                    <Link to="/admin-dashboard/staff">
                      Open team <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/admin-dashboard/staff/new">
                      <UserPlus className="size-4" /> Add
                    </Link>
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel title="Jump to" delay={0.2}>
              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 xl:grid-cols-2">
                {QUICK_LINKS.map((link) => (
                  <motion.div key={link.href} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                    <Link to={link.href} className="group flex items-center gap-2.5 rounded-xl border border-border/60 p-3 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
                        <link.icon className="size-4" />
                      </span>
                      <span className="truncate">{link.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
