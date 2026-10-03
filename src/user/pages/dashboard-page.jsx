"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeBookingStatus } from "@/lib/booking-pending-status";
import { fetchCustomerBookings } from "@/store/customer-bookings-slice";
import {
  ArrowRight,
  CalendarPlus,
  Crown,
  Gift,
  History,
  Hourglass,
  Tag,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { UserLayout } from "../portal/user-layout";

const UPCOMING = new Set(["PENDING", "CONFIRMED"]);

const shortcuts = [
  { label: "Live queue", hint: "See your place in line", href: "/user-dashboard/queue", icon: Hourglass },
  { label: "Offers", hint: "Deals and combos", href: "/user-dashboard/offers", icon: Tag },
  { label: "Membership", hint: "Unlock member prices", href: "/user-dashboard/membership", icon: Crown },
  { label: "Refer & Earn", hint: "Win free services", href: "/user-dashboard/loyalty", icon: Gift },
  { label: "History", hint: "Past bookings and reviews", href: "/user-dashboard/booking-history", icon: History },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Stat({ value, label, loading }) {
  return (
    <div className="rounded-2xl bg-card p-5">
      {loading ? <Skeleton className="h-9 w-16" /> : <p className="font-display text-3xl font-bold text-primary">{value}</p>}
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default function UserDashboardPage() {
  const { appUser, loading } = useAuth();
  const dispatch = useDispatch();
  const { bookings, loading: bookingsLoading } = useSelector((state) => state.customerBookings);
  const isUser = appUser?.role === "USER";
  const isFreeMember = `${appUser?.membershipSegment ?? "FREE"}`.toUpperCase() === "FREE";

  useEffect(() => {
    if (isUser) void dispatch(fetchCustomerBookings());
  }, [dispatch, isUser]);

  const { next, upcomingCount, visits, saved } = useMemo(() => {
    const now = Date.now();
    const upcoming = bookings
      .filter((b) => UPCOMING.has(normalizeBookingStatus(b.status)) && new Date(b.startsAt).getTime() >= now)
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    const done = bookings.filter((b) => normalizeBookingStatus(b.status) === "COMPLETED");
    return {
      next: upcoming[0] ?? null,
      upcomingCount: upcoming.length,
      visits: done.length,
      saved: done.reduce((sum, b) => sum + Number(b.discountAmount ?? 0), 0),
    };
  }, [bookings]);

  if (!loading && !isUser) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p>Sign in as a customer to view this page.</p>
        <Button asChild>
          <Link to="/auth/login">Customer login</Link>
        </Button>
      </div>
    );
  }

  const statsLoading = loading || (bookingsLoading && bookings.length === 0);
  const firstName = appUser?.name?.split(" ")[0] ?? "there";

  return (
    <UserLayout pageTitle="">
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Hero: greeting + the one thing to do next */}
        <section className="flex flex-col justify-between gap-8 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8 lg:col-span-2">
          <div>
            <p className="text-sm font-medium opacity-80">{greeting()}</p>
            <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{firstName}</h1>
          </div>

          {statsLoading ? (
            <Skeleton className="h-20 w-full max-w-md bg-primary-foreground/15" />
          ) : next ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Your next visit</p>
              <p className="mt-1 text-xl font-semibold sm:text-2xl">{next.service ?? "Appointment"}</p>
              <p className="mt-0.5 text-sm opacity-90">
                {new Date(next.startsAt).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })}
                {" · "}
                {new Date(next.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                {next.stylistName ? ` · with ${next.stylistName}` : ""}
              </p>
            </div>
          ) : (
            <p className="max-w-md text-base opacity-90">
              Nothing booked yet. Pick a service and a time that suits you. It takes about a minute.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-card px-6 text-base text-primary customer:hover:bg-card!"
            >
              <Link to="/user-dashboard/appointments">
                <CalendarPlus /> {next ? "Book another" : "Book now"}
              </Link>
            </Button>
            {next ? (
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-12 rounded-full px-5 text-base text-primary-foreground customer:hover:text-primary-foreground!"
              >
                <Link to="/user-dashboard/appointments">
                  Manage <ArrowRight />
                </Link>
              </Button>
            ) : null}
          </div>
        </section>

        {/* Membership */}
        <section className="flex flex-col justify-between gap-6 rounded-3xl bg-card p-6 sm:p-8">
          <div>
            <span className="grid size-11 place-items-center rounded-2xl bg-accent/15 text-accent">
              <Crown className="size-6" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold">
              {isFreeMember ? "Go premium" : "You're a member"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isFreeMember
                ? "Up to 40% off services, member-only combos and priority booking."
                : "Your member prices and perks apply automatically at booking."}
            </p>
          </div>
          <Button asChild variant={isFreeMember ? "default" : "secondary"} className="h-11 w-full rounded-full">
            <Link to="/user-dashboard/membership">
              {isFreeMember ? "See plans" : "View my plan"} <ArrowRight />
            </Link>
          </Button>
        </section>
      </div>

      {/* Numbers */}
      <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-4">
        <Stat value={upcomingCount} label="Upcoming" loading={statsLoading} />
        <Stat value={visits} label="Visits" loading={statsLoading} />
        <Stat value={`₹${Math.round(saved)}`} label="Saved" loading={statsLoading} />
      </div>

      {/* Shortcuts */}
      <h2 className="mb-3 mt-8 font-display text-xl font-semibold">Quick links</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
        {shortcuts.map(({ label, hint, href, icon: Icon }) => (
          <Link
            key={href}
            to={href}
            className="group flex min-h-28 flex-col justify-between rounded-2xl bg-card p-4 transition-transform hover:-translate-y-0.5"
          >
            <Icon className="size-6 text-primary" />
            <span>
              <span className="block text-sm font-semibold">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </UserLayout>
  );
}
