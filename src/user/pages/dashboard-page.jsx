"use client";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarPlus,
  Clock,
  Crown,
  Gift,
  Hourglass,
  RefreshCw,
  Scissors,
  Sparkles,
  Tag,
  UserRound,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { IconButton, ProgressRing, PullToRefresh, QueuePosition, ReferralShareCard, StatCard, StatusChip } from "@/components/kit";
import { SkeletonCard, SkeletonShimmer } from "@/components/motion/skeleton-shimmer";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { interaction, spring } from "@/components/motion/presets";
import { UserCountdown } from "@/components/kit-extra/user-countdown";
import { UserCarousel } from "@/components/kit-extra/user-carousel";
import { formatMoney } from "@/lib/format";
import { salonDateOf, salonRelativeDayLabel, salonTimeLabel } from "@/lib/salon-date";
import { formatWaitLabel } from "@/lib/queue-utils";
import { normalizeBookingStatus } from "@/lib/booking-pending-status";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { applyCustomerComboOffer, fetchCustomerBookings, fetchCustomerOffers } from "@/store/customer-bookings-slice";
import { fetchMyQueueStatus, fetchQueueBoard } from "@/store/queue-slice";
import { UserLayout } from "../portal/user-layout";
import { useInvite } from "../portal/user-frame-context";
import { useLoyalty } from "../lib/use-loyalty";
import { nextUpcoming } from "../lib/bookings";
import { SectionHeading } from "../components/section-heading";
import { ComboCard, DealCard, GlobalDiscountCard } from "../components/offer-cards";

const money = (n) => formatMoney(n);
const count = (n) => Math.round(n).toLocaleString("en-IN");

const QUICK = [
  { label: "Book", href: "/user-dashboard/appointments", icon: CalendarPlus, tone: "bg-portal text-portal-foreground shadow-glow" },
  { label: "Queue", href: "/user-dashboard/queue", icon: Hourglass },
  { label: "Bookings", href: "/user-dashboard/booking-history", icon: CalendarCheck2 },
  { label: "Offers", href: "/user-dashboard/offers", icon: Tag },
  { label: "Rewards", href: "/user-dashboard/loyalty", icon: Gift },
  { label: "Plans", href: "/user-dashboard/membership", icon: Crown },
];

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function NextVisitCard({ booking, loading }) {
  const reduce = useReducedMotion();
  if (loading) return <SkeletonShimmer className="h-56 rounded-card" />;
  if (!booking) {
    return (
      <div className="relative overflow-hidden isolate flex h-full min-h-56 flex-col justify-between gap-6 rounded-card bg-card p-6 ring-1 ring-inset ring-border/60">
        <div className="relative z-[2]">
          <p className="flex items-center gap-1.5 text-caption font-semibold text-ink-neutral">
            <CalendarPlus className="size-4" aria-hidden /> No visit booked
          </p>
          <p className="mt-2 max-w-sm font-display text-title font-bold">Treat yourself this week</p>
        </div>
        <motion.div whileTap={reduce ? undefined : interaction.press} className="relative z-[2] w-fit">
          <Link to="/user-dashboard/appointments" className="inline-flex h-12 items-center gap-2 rounded-control bg-portal px-6 font-semibold text-portal-foreground shadow-glow">
            <CalendarPlus className="size-5" aria-hidden /> Book now
          </Link>
        </motion.div>
      </div>
    );
  }
  const dayIso = salonDateOf(booking.startsAt);
  return (
    <div className="relative isolate flex h-full min-h-56 flex-col justify-between gap-5 overflow-hidden rounded-card p-6 bg-primary text-primary-foreground">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-caption font-semibold opacity-90">
            <CalendarCheck2 className="size-4" aria-hidden /> Next visit
          </p>
          <p className="mt-1.5 line-clamp-2 font-display text-title leading-tight font-bold">{booking.service ?? "Appointment"}</p>
        </div>
        <StatusChip status={booking.status} booking={booking} audience="customer" className="bg-primary-foreground! text-primary! ring-transparent!" />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <Clock className="size-4 opacity-80" aria-hidden />
            {salonRelativeDayLabel(dayIso)} · {salonTimeLabel(booking.startsAt)}
          </p>
          <p className="flex items-center gap-2 opacity-90">
            <UserRound className="size-4 opacity-80" aria-hidden />
            {booking.stylistName ?? "Stylist to be assigned"}
          </p>
        </div>
        <UserCountdown to={booking.startsAt} className="text-[1.6rem]" />
      </div>
      <Link to="/user-dashboard/booking-history" className="absolute inset-0 rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground" aria-label="Manage your next visit" />
    </div>
  );
}

function QueueWidget() {
  const { board, mine, boardLoading, mineLoading } = useSelector((state) => state.queue);
  const entry = mine?.current ?? null;
  const summary = board?.summary ?? mine?.summary ?? null;
  if ((boardLoading || mineLoading) && !board && !mine) return <SkeletonShimmer className="h-40 rounded-card" />;
  if (entry) {
    return (
      <Link to="/user-dashboard/queue" className="block rounded-card focus-visible:outline-2 focus-visible:outline-portal" aria-label="Open live queue">
        <QueuePosition
          position={entry.positionInLane ?? entry.salonPosition ?? 1}
          peopleAhead={entry.peopleAhead}
          waitMinutes={entry.status === "STARTED" ? entry.remainingMinutes : entry.waitMinutes}
          status={entry.status}
          ticket={entry.ticket}
        />
      </Link>
    );
  }
  const next = summary?.nextWalkInWaitMinutes;
  return (
    <Link
      to="/user-dashboard/queue"
      className="group flex h-full items-center gap-4 rounded-card bg-card p-5 shadow-soft ring-1 ring-inset ring-border/60 transition-shadow hover:shadow-lift"
    >
      <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-info/12 text-ink-info">
        <Hourglass className="relative size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-caption font-semibold text-ink-neutral">Salon right now</span>
        <span className="mt-0.5 block font-display text-headline font-bold">
          {next == null ? "Live queue" : next === 0 ? "A stylist is free" : `Next free in ${formatWaitLabel(next)}`}
        </span>
        {summary ? (
          <span className="mt-1 flex gap-3 text-caption text-ink-neutral">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden /> {summary.waitingCount ?? 0} waiting
            </span>
            <span className="inline-flex items-center gap-1">
              <Scissors className="size-3.5" aria-hidden /> {summary.inServiceCount ?? 0} in chair
            </span>
          </span>
        ) : null}
      </span>
      <ArrowRight className="size-5 text-ink-neutral transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  );
}

/** Plans call to action for customers without a paid membership. */
function MembershipCard() {
  return (
    <div className="flex min-w-0 flex-col">
      <SectionHeading icon={Crown} title="Membership" />
      <div className="flex flex-1 flex-col justify-between gap-4 rounded-card border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/15 text-ink-warning">
            <Crown className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">Member prices on every visit</p>
            <p className="mt-0.5 text-caption text-ink-neutral">Combos, member deals and priority booking.</p>
          </div>
        </div>
        <Link
          to="/user-dashboard/membership"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control border border-border text-sm font-semibold transition-colors hover:bg-muted"
        >
          View membership plans <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

export default function UserDashboardPage() {
  const { appUser, loading } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const openInvite = useInvite();
  const { bookings, loading: bookingsLoading, offers, offersLoading, bookingForm } = useSelector((state) => state.customerBookings);
  const isUser = appUser?.role === "USER";
  const { overview, loading: loyaltyLoading, reload: reloadLoyalty, referralCode, referralLink } = useLoyalty({ enabled: isUser });
  const segment = `${appUser?.membershipSegment ?? "FREE"}`.toUpperCase();
  const isMember = segment !== "FREE";

  const loadAll = useCallback(
    () =>
      Promise.allSettled([
        dispatch(fetchCustomerBookings()),
        dispatch(fetchCustomerOffers()),
        dispatch(fetchMyQueueStatus()),
        dispatch(fetchQueueBoard()),
        reloadLoyalty(),
      ]),
    [dispatch, reloadLoyalty]
  );

  useEffect(() => {
    if (!isUser) return;
    void dispatch(fetchCustomerBookings());
    void dispatch(fetchCustomerOffers());
    void dispatch(fetchMyQueueStatus());
    void dispatch(fetchQueueBoard());
  }, [dispatch, isUser]);

  const { next, visits, saved } = useMemo(() => {
    const done = bookings.filter((b) => normalizeBookingStatus(b.status) === "COMPLETED");
    return {
      next: nextUpcoming(bookings),
      visits: done.length,
      saved: done.reduce((sum, b) => sum + Number(b.discountAmount ?? 0), 0),
    };
  }, [bookings]);

  const statsLoading = loading || (bookingsLoading && bookings.length === 0);
  const firstName = appUser?.name?.split(" ")[0] ?? "there";
  const invited = Number(overview?.totalReferred ?? 0);
  const rewarded = Number(overview?.totalRewarded ?? 0);

  const offerSlides = useMemo(() => {
    const slides = [];
    if (offers?.globalDiscount) slides.push({ key: "global", kind: "global", data: offers.globalDiscount });
    for (const combo of offers?.combos ?? []) slides.push({ key: `c-${combo.id}`, kind: "combo", data: combo });
    for (const offer of offers?.membershipOffers ?? []) slides.push({ key: `m-${offer.id}`, kind: "member", data: offer });
    for (const offer of offers?.serviceOffers ?? []) slides.push({ key: `s-${offer.id}`, kind: "deal", data: offer });
    return slides.slice(0, 8);
  }, [offers]);

  const applyCombo = (combo) => {
    dispatch(applyCustomerComboOffer(combo));
    notify.success("Combo added", { description: "Pick a time to finish booking." });
    navigate("/user-dashboard/appointments");
  };

  return (
    <UserLayout
      pageTitle={`Hi, ${firstName}`}
      subtitle={greeting()}
      actions={<IconButton icon={RefreshCw} label="Refresh" className="hidden sm:inline-grid" onClick={() => void loadAll()} />}
    >
      <PullToRefresh onRefresh={loadAll}>
        <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-12 [&>*]:min-w-0" gap={0.07}>
          {/* Next visit */}
          <StaggerItem className="lg:col-span-7">
            <NextVisitCard booking={next} loading={statsLoading} />
          </StaggerItem>

          {/* Stats */}
          <StaggerItem className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-5">
            <StatCard icon={Wallet} label="Wallet" value={Number(overview?.walletBalance ?? 0)} format={money} loading={loyaltyLoading} onClick={() => navigate("/user-dashboard/loyalty")} />
            <StatCard icon={Sparkles} label="Saved" value={saved} format={money} tone="success" loading={statsLoading} />
            <StatCard icon={Scissors} label="Visits" value={visits} format={count} tone="info" loading={statsLoading} />
            <motion.button
              type="button"
              onClick={() => navigate("/user-dashboard/loyalty")}
              whileHover={reduce ? undefined : interaction.cardHover}
              whileTap={reduce ? undefined : interaction.press}
              transition={spring.soft}
              className="flex items-center gap-3 rounded-card border border-border/60 bg-card p-4 text-left shadow-soft transition-shadow hover:shadow-lift"
            >
              <ProgressRing value={rewarded} max={Math.max(1, invited)} size={60} stroke={7} tone="gold" label="Friends rewarded" showValue={false}>
                <Gift className="size-5 text-ink-warning" aria-hidden />
              </ProgressRing>
              <span className="min-w-0">
                <span className="block font-display text-[1.4rem] leading-none font-bold tabular-nums">
                  {rewarded}
                  <span className="text-sm text-ink-neutral">/{invited}</span>
                </span>
                <span className="mt-1 block text-caption font-semibold text-ink-neutral">Rewarded</span>
              </span>
            </motion.button>
          </StaggerItem>

          {/* Quick actions */}
          <StaggerItem className="lg:col-span-12">
            <nav aria-label="Quick actions" className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-3">
              {QUICK.map(({ label, href, icon: Icon, tone }) => (
                <motion.div key={href} whileHover={reduce ? undefined : interaction.cardHover} whileTap={reduce ? undefined : interaction.press} transition={spring.soft}>
                  <Link to={href} className="flex flex-col items-center gap-2 rounded-card bg-card px-2 py-3.5 text-center shadow-soft ring-1 ring-inset ring-border/60 transition-shadow hover:shadow-lift">
                    <span className={cn("grid size-12 place-items-center rounded-2xl bg-portal/12 text-portal", tone)}>
                      <Icon className="size-[22px]" aria-hidden />
                    </span>
                    <span className="text-caption font-semibold">{label}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>
          </StaggerItem>

          {/* Invite */}
          <StaggerItem className="lg:col-span-5">
            {loyaltyLoading ? (
              <SkeletonCard className="h-full min-h-56" />
            ) : referralCode ? (
              <ReferralShareCard
                className="h-full"
                code={referralCode}
                link={referralLink}
                walletBalance={Number(overview?.walletBalance ?? 0)}
                pendingCredit={Number(overview?.pendingCredit ?? 0)}
                progress={invited > 0 ? { current: rewarded, target: invited, label: "Friends rewarded" } : undefined}
                onInvite={openInvite}
              />
            ) : null}
          </StaggerItem>

          {/* Live queue */}
          <StaggerItem className="lg:col-span-7">
            <SectionHeading icon={Hourglass} title="Live queue" to="/user-dashboard/queue" linkLabel="Open" />
            <QueueWidget />
          </StaggerItem>

          {/* Offers and membership: one section, two columns from lg, stacked below. Each column
              sizes to its own content, so the carousel and the plans card can never overlap. */}
          {offersLoading || offerSlides.length || !isMember ? (
            <StaggerItem as="section" aria-label="Offers and membership" className="lg:col-span-12">
              <div className={cn("grid gap-4", offerSlides.length || offersLoading ? "lg:grid-cols-[minmax(0,1fr)_20rem]" : "")}>
                {offersLoading && !offers ? (
                  <div className="min-w-0">
                    <SectionHeading icon={Zap} title="Offers for you" />
                    <SkeletonShimmer className="h-36 rounded-card" />
                  </div>
                ) : offerSlides.length ? (
                  <div className="min-w-0">
                    <SectionHeading icon={Zap} title="Offers for you" to="/user-dashboard/offers" />
                    <UserCarousel label="Offers" slideClassName="basis-[85%] sm:basis-[48%] 2xl:basis-[32%]">
                      {offerSlides.map((slide) =>
                        slide.kind === "global" ? (
                          <GlobalDiscountCard key={slide.key} discount={slide.data} />
                        ) : slide.kind === "combo" ? (
                          <ComboCard key={slide.key} combo={slide.data} applied={bookingForm.comboId === slide.data.id} onApply={applyCombo} />
                        ) : (
                          <DealCard key={slide.key} offer={slide.data} member={slide.kind === "member"} onClick={() => navigate("/user-dashboard/appointments")} />
                        )
                      )}
                    </UserCarousel>
                  </div>
                ) : null}
                {!isMember ? <MembershipCard /> : null}
              </div>
            </StaggerItem>
          ) : null}
        </Stagger>
      </PullToRefresh>
    </UserLayout>
  );
}
