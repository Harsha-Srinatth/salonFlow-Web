"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerServicePicker, iconForCategory } from "@/components/services/customer-service-picker";
import { ServiceDetailsSheet } from "@/components/services/service-details-sheet";
import { salonDateIso, salonHour, salonTimeLabel } from "@/lib/salon-date";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";
import { authedRequest } from "@/lib/payments-api";
import {
  clearPendingPayment,
  isTerminalState,
  pollPaymentStatus,
  readPendingPayment,
  runRazorpayPayment,
} from "@/lib/razorpay-checkout";
import {
  createCustomerBookingAsync,
  fetchCustomerBookings,
  fetchCustomerOffers,
  fetchCustomerSlots,
  fetchCustomerServices,
  fetchRecommendedStylists,
  fetchCustomerStylists,
  resetCustomerBookingForm,
  setCustomerBookingField,
  setCustomerMembershipSegment,
  setCustomerVariantSelection,
  setCustomerRecommendedStylists,
} from "@/store/customer-bookings-slice";
import { resolveServicePrice } from "@/lib/service-pricing";
import { cn } from "@/lib/utils";
import { describeCancellationWindows } from "@/lib/cancellation-policy";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Gift,
  History,
  Loader2,
  Moon,
  ShoppingBag,
  Info,
  Pencil,
  RefreshCw,
  Scissors,
  Sparkles,
  Sun,
  Sunset,
  Ban,
  BadgePercent,
  Percent,
  ShieldCheck,
  Ticket,
  TriangleAlert,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { notify } from "@/lib/notify";
import { UserLayout } from "../portal/user-layout";

async function authedJson(path) {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl(path), {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? data : null;
}

async function fetchLoyaltySnapshot() {
  const data = await authedJson("/api/customer/loyalty");
  return {
    walletBalance: Number(data?.walletBalance ?? 0),
    isFirstTimeCustomer: Boolean(data?.isFirstTimeCustomer),
    firstBookingDiscountPercent: Number(data?.firstBookingDiscountPercent ?? 0),
  };
}

async function fetchUnclaimedVouchers() {
  const data = await authedJson("/api/customer/loyalty/vault");
  const map = new Map();
  for (const win of data?.wins ?? []) {
    if (win.status === "UNCLAIMED" && !map.has(win.serviceId)) map.set(win.serviceId, win.serviceName);
  }
  return map;
}

const STEPS = [
  { label: "Services", icon: Scissors },
  { label: "Date & time", icon: CalendarClock },
  { label: "Review", icon: CreditCard },
];

const REFUND_META = {
  FULL: { icon: ShieldCheck, tone: "bg-success/10 text-success" },
  PARTIAL: { icon: Percent, tone: "bg-warning/20 text-foreground" },
  NONE: { icon: Ban, tone: "bg-destructive/10 text-destructive" },
};

const rupees = (value) => `₹${(Math.round(Number(value) * 100) / 100).toLocaleString("en-IN")}`;
const timeLabel = (iso) => salonTimeLabel(iso);
const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

function Stepper({ step, maxStep, onJump }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Booking steps">
      {STEPS.map(({ label, icon: Icon }, index) => {
        const done = index < step;
        const active = index === step;
        const reachable = index <= maxStep;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none sm:last:flex-1">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onJump(index)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-semibold",
                active ? "bg-primary text-primary-foreground" : done ? "bg-secondary text-foreground" : "bg-card text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full",
                  active ? "bg-primary-foreground/20" : done ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {done ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              <span className={cn(active ? "inline" : "hidden sm:inline")}>{label}</span>
            </button>
            {index < STEPS.length - 1 ? (
              <span className={cn("h-0.5 flex-1 rounded-full", done ? "bg-primary" : "bg-muted")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
      <Icon className="size-5 text-primary" />
      {children}
    </h2>
  );
}

function SlotGroups({ slots, value, onPick }) {
  const groups = useMemo(() => {
    const buckets = [
      { key: "morning", label: "Morning", icon: Sun, items: [] },
      { key: "afternoon", label: "Afternoon", icon: Sunset, items: [] },
      { key: "evening", label: "Evening", icon: Moon, items: [] },
    ];
    for (const slot of slots) {
      const hour = salonHour(slot.startsAt);
      buckets[hour < 12 ? 0 : hour < 17 ? 1 : 2].items.push(slot);
    }
    return buckets.filter((bucket) => bucket.items.length);
  }, [slots]);

  return (
    <div className="space-y-4">
      {groups.map(({ key, label, icon: Icon, items }) => (
        <div key={key}>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Icon className="size-4" />
            {label}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((slot) => (
              <button
                key={slot.startsAt}
                type="button"
                aria-pressed={value === slot.startsAt}
                onClick={() => onPick(slot.startsAt)}
                className={cn(
                  "h-11 rounded-xl text-sm font-semibold",
                  value === slot.startsAt ? "bg-primary text-primary-foreground" : "bg-card"
                )}
              >
                {timeLabel(slot.startsAt)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ToggleRow({ icon: Icon, title, hint, checked, onChange, amount }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-2xl bg-secondary p-3 text-left"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-accent">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      {checked && amount > 0 ? <span className="text-sm font-bold text-success">-{rupees(amount)}</span> : null}
      <span className={cn("flex h-6 w-11 shrink-0 items-center rounded-full p-0.5", checked ? "bg-primary" : "bg-muted-foreground/30")}>
        <span className={cn("size-5 rounded-full bg-white transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
      </span>
    </button>
  );
}

function Row({ label, value, tone }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 text-sm", tone === "good" && "text-success")}>
      <span className={tone === "good" ? "" : "text-muted-foreground"}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function UserAppointmentsPage() {
  const { appUser, loading } = useAuth();
  const dispatch = useDispatch();
  const {
    stylists,
    services,
    servicesLoading,
    slots,
    slotsLoading,
    recommendedStylists,
    bookingForm,
    priceSummary,
    offers,
    mutating,
    error,
  } = useSelector((state) => state.customerBookings);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletCredit, setUseWalletCredit] = useState(false);
  const [isFirstTimeCustomer, setIsFirstTimeCustomer] = useState(false);
  const [firstBookingDiscountPercent, setFirstBookingDiscountPercent] = useState(0);
  const [unclaimedVouchers, setUnclaimedVouchers] = useState(new Map());
  const [useVoucher, setUseVoucher] = useState(true);
  // Payment lifecycle is tracked separately from the booking: nothing says "confirmed" until
  // the backend reports CONFIRMED for the payment.
  const [payPhase, setPayPhase] = useState("idle"); // idle | starting | loading_checkout | checkout | verifying
  const [payStatus, setPayStatus] = useState(null); // last payment DTO from the backend
  const [watching, setWatching] = useState(false); // actively polling the backend for a result
  const [confirmed, setConfirmed] = useState(null); // snapshot shown on the success screen
  const payingRef = useRef(false); // synchronous guard: state updates are too late for double clicks
  const pollingRef = useRef(false);
  const snapshotRef = useRef(null);

  const isUser = appUser?.role === "USER";
  // Salon-local dates (not UTC), re-checked when the tab comes back so a page left open past
  // midnight does not keep offering yesterday.
  const [todayIso, setTodayIso] = useState(() => salonDateIso(0));
  useEffect(() => {
    const refresh = () => setTodayIso((current) => (salonDateIso(0) === current ? current : salonDateIso(0)));
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const tomorrowIso = useMemo(() => salonDateIso(1, new Date(`${todayIso}T12:00:00Z`)), [todayIso]);

  // Service details open from the URL (?service=<id>) so the phone Back button closes them and a
  // details link can be shared/reloaded. Opening details never touches the booking.
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const detailsServiceId = searchParams.get("service");
  const openServiceDetails = useCallback(
    (serviceId) => {
      setSearchParams(
        (params) => {
          const next = new URLSearchParams(params);
          next.set("service", serviceId);
          return next;
        },
        { state: { serviceDetailsFromCatalog: true } }
      );
    },
    [setSearchParams]
  );
  const closeServiceDetails = useCallback(() => {
    if (location.state?.serviceDetailsFromCatalog) {
      navigate(-1);
      return;
    }
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.delete("service");
        return next;
      },
      { replace: true }
    );
  }, [location.state, navigate, setSearchParams]);

  const effectiveBookingDate = bookingForm.bookingDate || todayIso;
  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.startsAt === bookingForm.startsAt) ?? null,
    [slots, bookingForm.startsAt]
  );
  const stylistOptions = useMemo(() => {
    if (selectedSlot?.stylists?.length) return selectedSlot.stylists;
    if (recommendedStylists.length) return recommendedStylists;
    return stylists;
  }, [selectedSlot, recommendedStylists, stylists]);
  const selectedStylist = stylistOptions.find((item) => item.id === bookingForm.stylistId) ?? null;
  // Each pick as the customer will be charged for it: chosen size/length in the name, member rate for
  // member plans, and that option's own duration.
  const selectedServices = useMemo(
    () =>
      services
        .filter((service) => bookingForm.serviceIds.includes(service.id))
        .map((service) => {
          const { variant, price } = resolveServicePrice(service, bookingForm.variantSelections?.[service.id], appUser?.membershipSegment);
          if (!variant) return { ...service, basePrice: price };
          return {
            ...service,
            name: `${service.name} (${variant.name})`,
            basePrice: price,
            duration: Number(variant.duration) > 0 ? variant.duration : service.duration,
          };
        }),
    [services, bookingForm.serviceIds, bookingForm.variantSelections, appUser?.membershipSegment]
  );
  const detailService = useMemo(
    () => (detailsServiceId ? services.find((service) => service.id === detailsServiceId) ?? null : null),
    [services, detailsServiceId]
  );

  // Keep the chosen day valid: an old date (restored cart, page left open overnight) resets to today.
  useEffect(() => {
    if (!isUser) return;
    if (bookingForm.bookingDate !== todayIso && bookingForm.bookingDate !== tomorrowIso) {
      dispatch(setCustomerBookingField({ field: "bookingDate", value: todayIso }));
    }
  }, [bookingForm.bookingDate, dispatch, isUser, todayIso, tomorrowIso]);

  // Load everything once. (Previously this re-ran on every date change and refetched the catalog.)
  useEffect(() => {
    if (!isUser) return;
    void dispatch(fetchCustomerStylists());
    void dispatch(fetchCustomerServices());
    void dispatch(fetchCustomerOffers());
    void fetchLoyaltySnapshot().then((snapshot) => {
      setWalletBalance(snapshot.walletBalance);
      setIsFirstTimeCustomer(snapshot.isFirstTimeCustomer);
      setFirstBookingDiscountPercent(snapshot.firstBookingDiscountPercent);
    });
    void fetchUnclaimedVouchers().then(setUnclaimedVouchers);
  }, [dispatch, isUser]);

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);

  useEffect(() => {
    if (!bookingForm.serviceIds.length || !bookingForm.startsAt) {
      dispatch(setCustomerRecommendedStylists([]));
      return;
    }
    void dispatch(
      fetchRecommendedStylists({
        serviceIds: bookingForm.serviceIds,
        startsAt: bookingForm.startsAt,
        variantSelections: bookingForm.variantSelections,
      })
    );
  }, [bookingForm.startsAt, bookingForm.serviceIds, bookingForm.variantSelections, dispatch]);

  useEffect(() => {
    if (!bookingForm.serviceIds.length || !effectiveBookingDate) return;
    void dispatch(
      fetchCustomerSlots({
        serviceIds: bookingForm.serviceIds,
        date: effectiveBookingDate,
        variantSelections: bookingForm.variantSelections,
      })
    );
  }, [effectiveBookingDate, bookingForm.serviceIds, bookingForm.variantSelections, dispatch]);

  // The member rate depends on the customer's plan; keep the store's price estimate in step with it.
  useEffect(() => {
    dispatch(setCustomerMembershipSegment(appUser?.membershipSegment ?? "FREE"));
  }, [appUser?.membershipSegment, dispatch]);

  // Always keep a valid stylist once a time is chosen, so the form can never look complete yet stay blocked.
  useEffect(() => {
    if (!selectedSlot || !stylistOptions.length) return;
    if (!stylistOptions.some((item) => item.id === bookingForm.stylistId)) {
      dispatch(setCustomerBookingField({ field: "stylistId", value: stylistOptions[0].id }));
    }
  }, [bookingForm.stylistId, dispatch, selectedSlot, stylistOptions]);

  // Stable identity (reads the latest ids from a ref) so memoised service cards don't all re-render on each tap.
  const serviceIdsRef = useRef(bookingForm.serviceIds);
  serviceIdsRef.current = bookingForm.serviceIds;
  const toggleService = useCallback(
    (serviceId, checked) => {
      const current = serviceIdsRef.current ?? [];
      const next = checked ? Array.from(new Set([...current, serviceId])) : current.filter((id) => id !== serviceId);
      dispatch(setCustomerBookingField({ field: "serviceIds", value: next }));
    },
    [dispatch]
  );

  const firstBookingDiscountAmount = isFirstTimeCustomer
    ? Math.round(priceSummary.payableAmount * (firstBookingDiscountPercent / 100) * 100) / 100
    : 0;
  const afterFirstBookingDiscount = Math.max(0, priceSummary.payableAmount - firstBookingDiscountAmount);

  // Not offered alongside a combo — see the matching guard in createCustomerBooking on the backend.
  const voucherServiceId = !bookingForm.comboId ? bookingForm.serviceIds.find((id) => unclaimedVouchers.has(id)) ?? null : null;
  const voucherServiceName = voucherServiceId ? unclaimedVouchers.get(voucherServiceId) : null;
  const voucherPriced = voucherServiceId ? (offers?.pricedServices ?? []).find((item) => item.serviceId === voucherServiceId) : null;
  const voucherService = voucherServiceId ? services.find((item) => item.id === voucherServiceId) : null;
  const voucherDiscountAmount =
    voucherServiceId && useVoucher
      ? Math.min(afterFirstBookingDiscount, Number(voucherPriced?.finalPrice ?? voucherService?.basePrice ?? 0))
      : 0;
  const afterVoucherDiscount = Math.max(0, afterFirstBookingDiscount - voucherDiscountAmount);
  const walletRedeemAmount = useWalletCredit ? Math.min(walletBalance, afterVoucherDiscount) : 0;
  const finalPayableAmount = Math.max(0, afterVoucherDiscount - walletRedeemAmount);

  function refreshAfterBooking() {
    setConfirmed(snapshotRef.current ?? {});
    dispatch(resetCustomerBookingForm());
    dispatch(setCustomerBookingField({ field: "bookingDate", value: todayIso }));
    setUseWalletCredit(false);
    setStep(0);
    setMaxStep(0);
    void dispatch(fetchCustomerBookings());
    void fetchUnclaimedVouchers().then(setUnclaimedVouchers);
    void fetchLoyaltySnapshot().then((snapshot) => {
      setWalletBalance(snapshot.walletBalance);
      setIsFirstTimeCustomer(snapshot.isFirstTimeCustomer);
      setFirstBookingDiscountPercent(snapshot.firstBookingDiscountPercent);
    });
  }

  function applyPaymentResult(status) {
    setPayStatus(status);
    if (!status) return;
    if (status.state === "CONFIRMED") {
      clearPendingPayment();
      refreshAfterBooking();
    } else if (isTerminalState(status.state)) {
      clearPendingPayment();
      if (status.state === "FAILED") notify.error("Payment failed", { description: status.message });
      else notify.message("Payment not completed", { description: status.message });
    }
  }

  async function watchPayment(orderId) {
    if (pollingRef.current) return;
    pollingRef.current = true;
    setWatching(true);
    try {
      const result = await pollPaymentStatus(authedRequest, orderId, {
        onUpdate: (status) => setPayStatus(status),
        shouldStop: () => !pollingRef.current,
      });
      applyPaymentResult(result);
    } catch {
      clearPendingPayment();
      setPayStatus(null);
    } finally {
      pollingRef.current = false;
      setWatching(false);
    }
  }

  async function createBooking() {
    if (payingRef.current) return;
    payingRef.current = true;
    setPayStatus(null);
    snapshotRef.current = {
      services: selectedServices.map((service) => service.name),
      startsAt: bookingForm.startsAt,
      stylist: selectedStylist?.name,
      amount: finalPayableAmount,
    };
    const payload = {
      serviceIds: bookingForm.serviceIds,
      variantSelections: bookingForm.variantSelections,
      bookingDate: effectiveBookingDate,
      startsAt: bookingForm.startsAt,
      stylistId: bookingForm.stylistId,
      comboId: bookingForm.comboId || undefined,
      useWalletCredit: useWalletCredit && walletRedeemAmount > 0,
      redeemRewardServiceId: voucherDiscountAmount > 0 ? voucherServiceId : undefined,
    };
    try {
      const result = await runRazorpayPayment({ request: authedRequest, payload, onPhase: setPayPhase });
      if (result.outcome === "NO_PAYMENT_REQUIRED") {
        // Nothing owed (fully covered by credit / voucher): book directly.
        const booked = await dispatch(createCustomerBookingAsync(payload));
        if (createCustomerBookingAsync.rejected.match(booked)) {
          notify.error(booked.payload?.message ?? "Could not create booking");
          return;
        }
        refreshAfterBooking();
        return;
      }
      applyPaymentResult(result.status);
      if (result.status && !isTerminalState(result.status.state) && result.status.orderId) {
        void watchPayment(result.status.orderId);
      }
    } catch (err) {
      notify.error(err?.message ?? "Could not start the payment");
    } finally {
      payingRef.current = false;
      setPayPhase("idle");
    }
  }

  // Page refresh / returning from a UPI app: resume a payment that had not finished instead of
  // leaving the customer guessing (and instead of letting them pay a second time).
  useEffect(() => {
    if (!isUser) return;
    const pending = readPendingPayment();
    if (pending?.orderId) void watchPayment(pending.orderId);
    return () => {
      pollingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUser]);

  function goTo(next) {
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return (
      <UserLayout pageTitle="Book">
        <Skeleton className="h-96 rounded-3xl" />
      </UserLayout>
    );
  }

  if (!isUser) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p>Sign in as a customer to book appointments.</p>
        <Button asChild>
          <Link to="/auth/login">Customer login</Link>
        </Button>
      </div>
    );
  }

  if (confirmed) {
    return (
      <UserLayout pageTitle="">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-3xl bg-card p-8 text-center">
          <span className="grid size-20 place-items-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-10" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">You're booked</h1>
            {confirmed.startsAt ? (
              <p className="mt-1 text-muted-foreground">
                {dayLabel(confirmed.startsAt.slice(0, 10))} · {timeLabel(confirmed.startsAt)}
                {confirmed.stylist ? ` · ${confirmed.stylist}` : ""}
              </p>
            ) : null}
          </div>
          {confirmed.services?.length ? (
            <ul className="w-full space-y-2 rounded-2xl bg-secondary p-4 text-left text-sm">
              {confirmed.services.map((name) => (
                <li key={name} className="flex items-center gap-2 font-medium">
                  <Scissors className="size-4 text-primary" />
                  {name}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button asChild className="h-12 flex-1 rounded-full">
              <Link to="/user-dashboard/booking-history">
                <History /> My bookings
              </Link>
            </Button>
            <Button variant="secondary" className="h-12 flex-1 rounded-full" onClick={() => setConfirmed(null)}>
              <CalendarCheck /> Book another
            </Button>
          </div>
        </div>
      </UserLayout>
    );
  }

  const totalSavings = Number(priceSummary.discountAmount ?? 0) + firstBookingDiscountAmount + voucherDiscountAmount;
  const cancellation = describeCancellationWindows(bookingForm.startsAt);
  const busy = mutating || payPhase !== "idle" || watching;
  const slotGone = Boolean(bookingForm.startsAt) && !selectedSlot && !slotsLoading;
  const timeReady = Boolean(selectedSlot) && Boolean(selectedStylist);

  // One place decides whether "continue" is enabled and, if not, says why.
  let blocker = null;
  if (step === 0 && !bookingForm.serviceIds.length) blocker = "Pick at least one service";
  else if (step === 1 && !timeReady) blocker = slotGone ? "That time was just taken. Pick another" : "Choose a time";
  else if (step === 2 && !timeReady) blocker = "Choose a time first";

  const stepBack = step > 0 && !busy;
  const payLabel =
    payPhase === "verifying"
      ? "Verifying payment"
      : payPhase === "checkout"
        ? "Finish paying in the window"
        : "Preparing payment";

  const unitPrice = (service) => {
    const priced = (offers?.pricedServices ?? []).find((item) => item.serviceId === service.id);
    const percent = Number(priced?.appliedPercent ?? 0);
    return Math.max(0, Math.round((Number(service.basePrice ?? 0) * (1 - percent / 100)) * 100) / 100);
  };
  const nextLabel = step === 0 ? "Pick a time" : "Review";

  const actions = (
    <div className="flex items-center gap-2">
      {stepBack ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Back"
          className="size-12 shrink-0 rounded-full"
          onClick={() => goTo(step - 1)}
        >
          <ArrowLeft />
        </Button>
      ) : null}
      {step < 2 ? (
        <Button
          type="button"
          className="h-12 flex-1 rounded-full px-6 text-base"
          disabled={Boolean(blocker)}
          onClick={() => goTo(step + 1)}
        >
          {nextLabel} <ArrowRight />
        </Button>
      ) : (
        <Button
          type="button"
          className="h-12 flex-1 rounded-full px-6 text-base"
          disabled={busy || Boolean(blocker)}
          onClick={() => void createBooking()}
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              {watching && payPhase === "idle" ? "Checking" : payLabel}
            </>
          ) : finalPayableAmount > 0 ? (
            <>
              <CreditCard /> Pay {rupees(finalPayableAmount)}
            </>
          ) : (
            <>
              <CheckCircle2 /> Confirm
            </>
          )}
        </Button>
      )}
    </div>
  );

  return (
    <UserLayout pageTitle="Book">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6 pb-40 lg:pb-0">
          <Stepper step={step} maxStep={maxStep} onJump={goTo} />

          {bookingForm.comboId ? (
            <div className="flex items-center gap-3 rounded-2xl bg-success/10 p-3 text-sm font-medium text-success">
              <Gift className="size-5 shrink-0" />
              {priceSummary.offerLabel ?? "Combo offer applied"}
            </div>
          ) : null}

          {step === 0 ? (
            <section>
              <SectionTitle icon={Scissors}>What would you like?</SectionTitle>
              <CustomerServicePicker
                services={services}
                loading={servicesLoading}
                selectedIds={bookingForm.serviceIds}
                pricedServices={offers?.pricedServices}
                variantSelections={bookingForm.variantSelections}
                membershipSegment={appUser?.membershipSegment}
                onSelectVariant={(serviceId, variant) => dispatch(setCustomerVariantSelection({ serviceId, variant }))}
                onToggle={toggleService}
                onOpenDetails={openServiceDetails}
              />
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-8">
              <div>
                <SectionTitle icon={CalendarClock}>Day</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  {[todayIso, tomorrowIso].map((iso, index) => (
                    <button
                      key={iso}
                      type="button"
                      aria-pressed={effectiveBookingDate === iso}
                      onClick={() => dispatch(setCustomerBookingField({ field: "bookingDate", value: iso }))}
                      className={cn(
                        "flex flex-col items-start rounded-2xl p-4 text-left",
                        effectiveBookingDate === iso ? "bg-primary text-primary-foreground" : "bg-card"
                      )}
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        {index === 0 ? "Today" : "Tomorrow"}
                      </span>
                      <span className="text-lg font-bold">{dayLabel(iso)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionTitle icon={Clock}>Time</SectionTitle>
                {slotsLoading && !slots.length ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {Array.from({ length: 12 }, (_, i) => (
                      <Skeleton key={i} className="h-11" />
                    ))}
                  </div>
                ) : slots.length ? (
                  <SlotGroups
                    slots={slots}
                    value={bookingForm.startsAt}
                    onPick={(value) => dispatch(setCustomerBookingField({ field: "startsAt", value }))}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 rounded-2xl bg-card py-10 text-center">
                    <CalendarX className="size-8 text-muted-foreground" />
                    <p className="font-semibold">No free times this day</p>
                    {effectiveBookingDate === todayIso ? (
                      <button
                        type="button"
                        className="text-sm font-medium text-primary underline"
                        onClick={() => dispatch(setCustomerBookingField({ field: "bookingDate", value: tomorrowIso }))}
                      >
                        Try tomorrow
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {selectedSlot && stylistOptions.length ? (
                <div>
                  <SectionTitle icon={User}>Stylist</SectionTitle>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {stylistOptions.map((stylist) => {
                      const active = stylist.id === bookingForm.stylistId;
                      return (
                        <button
                          key={stylist.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => dispatch(setCustomerBookingField({ field: "stylistId", value: stylist.id }))}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl p-3 text-left ring-2",
                            active ? "bg-primary/10 ring-primary" : "bg-card ring-transparent"
                          )}
                        >
                          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-base font-bold text-accent-foreground">
                            {`${stylist.name ?? "?"}`.charAt(0).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-semibold">{stylist.name}</span>
                          {active ? <Check className="size-5 text-primary" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-4">
              <div className="space-y-1 rounded-3xl bg-card p-5">
              {selectedServices.map((service) => {
                const original = Number(service.basePrice ?? 0);
                const final = unitPrice(service);
                return (
                  <div key={service.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <Scissors className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{service.name}</span>
                      <span className="shrink-0 text-xs font-normal text-muted-foreground">{service.duration} min</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-1.5 text-sm font-semibold">
                      {final < original ? (
                        <span className="text-xs font-normal text-muted-foreground line-through">{rupees(original)}</span>
                      ) : null}
                      {rupees(final)}
                    </span>
                  </div>
                );
              })}
                <div className="my-3 h-px bg-border" />
                <button type="button" onClick={() => goTo(1)} className="flex w-full items-center gap-3 py-1.5 text-left text-sm">
                  <CalendarClock className="size-4 shrink-0 text-primary" />
                  <span className="flex-1 font-medium">
                    {dayLabel(effectiveBookingDate)} · {bookingForm.startsAt ? timeLabel(bookingForm.startsAt) : "-"}
                  </span>
                  <Pencil className="size-4 text-muted-foreground" />
                </button>
                <button type="button" onClick={() => goTo(1)} className="flex w-full items-center gap-3 py-1.5 text-left text-sm">
                  <User className="size-4 shrink-0 text-primary" />
                  <span className="flex-1 font-medium">{selectedStylist?.name ?? "-"}</span>
                  <Pencil className="size-4 text-muted-foreground" />
                </button>
              </div>

              {isFirstTimeCustomer && firstBookingDiscountPercent > 0 ? (
                <div className="flex items-center gap-3 rounded-2xl bg-success/10 p-3 text-sm font-medium text-success">
                  <Sparkles className="size-5 shrink-0" />
                  {firstBookingDiscountPercent}% off your first booking
                </div>
              ) : null}

              {voucherServiceId ? (
                <ToggleRow
                  icon={Ticket}
                  title="Free-service voucher"
                  hint={voucherServiceName}
                  checked={useVoucher}
                  onChange={setUseVoucher}
                  amount={voucherDiscountAmount}
                />
              ) : null}
              {walletBalance > 0 && afterVoucherDiscount > 0 ? (
                <ToggleRow
                  icon={Wallet}
                  title="Wallet credit"
                  hint={`${rupees(walletBalance)} available`}
                  checked={useWalletCredit}
                  onChange={setUseWalletCredit}
                  amount={walletRedeemAmount}
                />
              ) : null}

            {totalSavings > 0 ? (
              <div className="flex items-center gap-3 rounded-2xl bg-success/10 p-3 text-sm font-semibold text-success">
                <BadgePercent className="size-5 shrink-0" />
                You save {rupees(totalSavings)} on this booking
              </div>
            ) : null}

            <div className="space-y-2.5 rounded-3xl bg-card p-5">
              <Row label="Subtotal" value={rupees(priceSummary.totalAmount)} />
                {priceSummary.discountAmount > 0 ? (
                  <Row label={priceSummary.offerLabel ?? "Offer"} value={`-${rupees(priceSummary.discountAmount)}`} tone="good" />
                ) : null}
                {firstBookingDiscountAmount > 0 ? (
                  <Row label="First booking" value={`-${rupees(firstBookingDiscountAmount)}`} tone="good" />
                ) : null}
                {voucherDiscountAmount > 0 ? <Row label="Voucher" value={`-${rupees(voucherDiscountAmount)}`} tone="good" /> : null}
                {walletRedeemAmount > 0 ? <Row label="Wallet" value={`-${rupees(walletRedeemAmount)}`} tone="good" /> : null}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="font-semibold">Total</span>
                  <span className="font-display text-2xl font-bold text-primary">{rupees(finalPayableAmount)}</span>
                </div>
              </div>

            <div className="space-y-3 rounded-3xl bg-card p-5">
              <h3 className="flex items-center gap-2 font-display text-base font-semibold">
                <ShieldCheck className="size-5 text-primary" />
                Cancellation and refunds
              </h3>
              <ul className="space-y-2">
                {cancellation.tiers.map((tier) => {
                  const meta = REFUND_META[tier.key];
                  const Icon = meta.icon;
                  const isCurrent = tier.key === cancellation.current;
                  return (
                    <li
                      key={tier.key}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl p-3",
                        isCurrent ? meta.tone : "bg-secondary",
                        !tier.available && "opacity-50"
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          {tier.title}
                          {isCurrent ? (
                            <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold uppercase">Applies now</span>
                          ) : null}
                        </span>
                        <span className="block text-xs text-muted-foreground">{tier.when}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs text-muted-foreground">
                Refunds are based on what you paid. The exact amount is shown before you confirm a cancellation, and you can
                cancel from History.
              </p>
            </div>

            {payStatus && payStatus.state !== "CONFIRMED" && payStatus.state !== "AWAITING_PAYMENT" ? (
                <div
                  role="status"
                  className={cn(
                    "flex items-start gap-3 rounded-2xl p-4 text-sm",
                    ["FAILED", "EXPIRED", "REFUNDING", "REFUNDED"].includes(payStatus.state) ? "bg-destructive/10" : "bg-secondary"
                  )}
                >
                  {watching ? (
                    <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin" />
                  ) : (
                    <TriangleAlert className="mt-0.5 size-5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">
                      {payStatus.state === "PENDING" || payStatus.state === "PROCESSING"
                        ? watching
                          ? "Checking your payment…"
                          : "Payment not confirmed yet"
                        : payStatus.state === "CANCELLED"
                          ? "Payment cancelled"
                          : payStatus.state === "FAILED"
                            ? "Payment failed"
                            : payStatus.state === "EXPIRED"
                              ? "Payment timed out"
                              : "Payment received, booking not made"}
                    </p>
                    {payStatus.message ? <p className="mt-0.5 text-muted-foreground">{payStatus.message}</p> : null}
                    {(payStatus.state === "PENDING" || payStatus.state === "PROCESSING") && !watching ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-full"
                          onClick={() => payStatus.orderId && void watchPayment(payStatus.orderId)}
                        >
                          <RefreshCw /> Check again
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            clearPendingPayment();
                            setPayStatus(null);
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

        </div>

        {/* Desktop: live summary beside the steps, with the action buttons inside it */}
        <aside className="hidden lg:block" aria-label="Your booking">
          <div className="sticky top-28 space-y-4 rounded-3xl bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <ShoppingBag className="size-5 text-primary" />
              Your booking
            </h2>

            {selectedServices.length ? (
              <ul className="space-y-2">
                {selectedServices.map((service) => (
                  <li key={service.id} className="flex items-center gap-2 text-sm">
                    <Scissors className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate font-medium">{service.name}</span>
                    <span className="font-semibold">{rupees(unitPrice(service))}</span>
                    {step === 0 ? (
                      <button
                        type="button"
                        aria-label={`Remove ${service.name}`}
                        onClick={() => toggleService(service.id, false)}
                        className="grid size-6 place-items-center rounded-full bg-muted"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">No services picked yet</p>
            )}

            {bookingForm.startsAt ? (
              <div className="space-y-2 border-t border-border pt-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <CalendarClock className="size-4 text-primary" />
                  {dayLabel(effectiveBookingDate)} · {timeLabel(bookingForm.startsAt)}
                </p>
                {selectedStylist ? (
                  <p className="flex items-center gap-2 font-medium">
                    <User className="size-4 text-primary" />
                    {selectedStylist.name}
                  </p>
                ) : null}
              </div>
            ) : null}

            {totalSavings > 0 || walletRedeemAmount > 0 ? (
              <div className="space-y-1.5 border-t border-border pt-3 text-sm">
                <p className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{rupees(priceSummary.totalAmount)}</span>
                </p>
                {totalSavings > 0 ? (
                  <p className="flex justify-between font-medium text-success">
                    <span className="flex items-center gap-1.5">
                      <BadgePercent className="size-4" /> Offers and discounts
                    </span>
                    <span>-{rupees(totalSavings)}</span>
                  </p>
                ) : null}
                {walletRedeemAmount > 0 ? (
                  <p className="flex justify-between font-medium text-success">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="size-4" /> Wallet credit
                    </span>
                    <span>-{rupees(walletRedeemAmount)}</span>
                  </p>
                ) : null}
              </div>
            ) : null}

            {bookingForm.startsAt && cancellation.current !== "NONE" ? (
              <p className="flex items-start gap-2 rounded-2xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                {cancellation.current === "FULL" ? "Full refund" : "50% refund"} if you{" "}
                {cancellation.tiers.find((tier) => tier.key === cancellation.current)?.when.replace("Cancel before", "cancel before")}
              </p>
            ) : null}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-2xl font-bold text-primary">{rupees(finalPayableAmount)}</span>
            </div>

            {blocker ? (
              <p className="flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2 text-sm text-muted-foreground">
                <Info className="size-4 shrink-0" />
                {blocker}
              </p>
            ) : null}
            {actions}
          </div>
        </aside>
      </div>

      {/* Phone and tablet: compact bar above the bottom tabs */}
      <div className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 px-3 lg:hidden">
        <div className="mx-auto max-w-xl space-y-2 rounded-3xl bg-card p-3 shadow-xl shadow-black/10">
          {step === 0 && selectedServices.length ? (
            <ul aria-label="Selected services" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
              {selectedServices.map((service) => (
                <li key={service.id} className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 py-1 pl-3 pr-1 text-xs font-semibold text-primary">
                  <span className="max-w-[9rem] truncate">{service.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${service.name}`}
                    onClick={() => toggleService(service.id, false)}
                    className="grid size-6 place-items-center rounded-full bg-card"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              {blocker ??
                `${bookingForm.serviceIds.length} service${bookingForm.serviceIds.length === 1 ? "" : "s"}${
                  step > 0 && bookingForm.startsAt ? ` · ${timeLabel(bookingForm.startsAt)}` : ""
                }`}
            </p>
            <p className="shrink-0 font-display text-lg font-bold">{rupees(finalPayableAmount)}</p>
          </div>
          {actions}
        </div>
      </div>
      <ServiceDetailsSheet
        open={Boolean(detailsServiceId)}
        state={detailService ? "ready" : servicesLoading || (!services.length && !error) ? "loading" : "missing"}
        service={detailService}
        selected={detailService ? bookingForm.serviceIds.includes(detailService.id) : false}
        priced={detailService ? (offers?.pricedServices ?? []).find((item) => item.serviceId === detailService.id) : null}
        fallbackIcon={detailService ? iconForCategory(detailService.category ?? "") : undefined}
        onToggle={toggleService}
        onClose={closeServiceDetails}
      />
    </UserLayout>
  );
}
