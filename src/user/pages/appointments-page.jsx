"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BadgePercent,
  Ban,
  CalendarClock,
  CalendarX,
  CreditCard,
  Gift,
  Percent,
  Pencil,
  ReceiptText,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Ticket,
  TriangleAlert,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { CustomerServicePicker, iconForCategory } from "@/components/services/customer-service-picker";
import { ServiceDetailsSheet } from "@/components/services/service-details-sheet";
import { AnimatedStepper, Avatar, BrandDots, BrandLoader, DayTabs, EmptyState, SlideToConfirm, TimeSlotPicker } from "@/components/kit";
import { haptic, interaction, spring } from "@/components/motion/presets";
import { UserPriceBreakdown } from "@/components/kit-extra/user-price-breakdown";
import { salonDateIso, salonRelativeDayLabel, salonTimeLabel } from "@/lib/salon-date";
import { formatMoney } from "@/lib/format";
import { authedRequest } from "@/lib/payments-api";
import { clearPendingPayment, isTerminalState, pollPaymentStatus, readPendingPayment, runRazorpayPayment } from "@/lib/razorpay-checkout";
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
import { notify } from "@/lib/notify";
import { UserLayout } from "../portal/user-layout";
import { useInvite } from "../portal/user-frame-context";
import { loadLoyalty, useLoyalty } from "../lib/use-loyalty";
import { fetchRewardVault } from "../lib/user-api";
import { StylistPicker } from "../components/booking/stylist-picker";
import { ToggleRow } from "../components/booking/toggle-row";
import { BookingSuccess } from "../components/booking/booking-success";
import { BookingAside, CartBar } from "../components/booking/booking-summary";
import { SectionHeading } from "../components/section-heading";

async function fetchUnclaimedVouchers() {
  const data = await fetchRewardVault().catch(() => null);
  const map = new Map();
  for (const win of data?.wins ?? []) {
    if (win.status === "UNCLAIMED" && !map.has(win.serviceId)) map.set(win.serviceId, win.serviceName);
  }
  return map;
}

const STEPS = [
  { id: "services", label: "Services", icon: Scissors },
  { id: "stylist", label: "Stylist", icon: Users },
  { id: "time", label: "Time", icon: CalendarClock },
  { id: "review", label: "Review", icon: ReceiptText },
  { id: "pay", label: "Pay", icon: CreditCard },
];
const NEXT_LABEL = ["Choose stylist", "Pick a time", "Review", "Continue to pay"];

const REFUND_META = {
  FULL: { icon: ShieldCheck, tone: "bg-success/12 text-ink-success" },
  PARTIAL: { icon: Percent, tone: "bg-warning/14 text-ink-warning" },
  NONE: { icon: Ban, tone: "bg-destructive/12 text-ink-destructive" },
};

const money = (value) => formatMoney(value);
const dayLabel = (iso) => salonRelativeDayLabel(iso);

function StepPanel({ stepKey, direction, children }) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      key={stepKey}
      custom={direction}
      // The outgoing step leaves instantly, so the next one is interactive right away.
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: direction * 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, transition: { duration: 0 } }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="min-w-0"
    >
      {children}
    </motion.section>
  );
}

function EditRow({ icon: Icon, children, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left text-sm transition-colors hover:bg-muted">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-portal/12 text-portal">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{children}</span>
      <Pencil className="size-4 text-ink-neutral" aria-hidden />
    </button>
  );
}

export default function UserAppointmentsPage() {
  const { appUser, loading } = useAuth();
  const dispatch = useDispatch();
  const reduce = useReducedMotion();
  const openInvite = useInvite();
  const { stylists, services, servicesLoading, slots, slotsLoading, recommendedStylists, bookingForm, priceSummary, offers, mutating, error } = useSelector(
    (state) => state.customerBookings
  );
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [direction, setDirection] = useState(1);
  // "" = any stylist. Kept locally because choosing a time resets the store's stylistId.
  const [preferredStylistId, setPreferredStylistId] = useState("");
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
  const { referralLink } = useLoyalty({ enabled: isUser });
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
  const selectedSlot = useMemo(() => slots.find((slot) => slot.startsAt === bookingForm.startsAt) ?? null, [slots, bookingForm.startsAt]);
  const stylistOptions = useMemo(() => {
    if (selectedSlot?.stylists?.length) return selectedSlot.stylists;
    if (recommendedStylists.length) return recommendedStylists;
    return stylists;
  }, [selectedSlot, recommendedStylists, stylists]);
  const selectedStylist = stylistOptions.find((item) => item.id === bookingForm.stylistId) ?? null;
  const preferredStylist = stylists.find((item) => item.id === preferredStylistId) ?? null;
  // Each pick as the customer will be charged for it: chosen size/length in the name, member rate for
  // member plans, and that option's own duration.
  const selectedServices = useMemo(
    () =>
      services
        .filter((service) => bookingForm.serviceIds.includes(service.id))
        .map((service) => {
          const { variant, price } = resolveServicePrice(service, bookingForm.variantSelections?.[service.id], appUser?.membershipSegment);
          if (!variant) return { ...service, basePrice: price };
          return { ...service, name: `${service.name} (${variant.name})`, basePrice: price, duration: Number(variant.duration) > 0 ? variant.duration : service.duration };
        }),
    [services, bookingForm.serviceIds, bookingForm.variantSelections, appUser?.membershipSegment]
  );
  const totalDurationMinutes = useMemo(() => selectedServices.reduce((sum, service) => sum + (Number(service.duration) || 0), 0), [selectedServices]);
  const detailService = useMemo(() => (detailsServiceId ? services.find((service) => service.id === detailsServiceId) ?? null : null), [services, detailsServiceId]);

  // Slots seen through the chosen stylist: times they are not free are shown as unavailable with the
  // reason, and a time with a single free stylist left is "filling fast". Both come from slot.stylists.
  const slotsForPicker = useMemo(
    () =>
      slots.map((slot) => {
        if (!Array.isArray(slot.stylists)) return slot;
        if (preferredStylistId && !slot.stylists.some((s) => s.id === preferredStylistId)) {
          return { ...slot, availability: "unavailable", reason: `${preferredStylist?.name?.split(" ")[0] ?? "Your stylist"} is busy` };
        }
        if (!slot.stylists.length) return { ...slot, availability: "busy" };
        return !preferredStylistId && slot.stylists.length === 1 ? { ...slot, availability: "limited", seatsLeft: 1 } : slot;
      }),
    [slots, preferredStylistId, preferredStylist]
  );
  const freeCounts = useMemo(() => {
    if (!slots.length || !slots.some((slot) => Array.isArray(slot.stylists))) return null;
    const byId = {};
    let any = 0;
    for (const slot of slots) {
      if (slot.stylists?.length) any += 1;
      for (const s of slot.stylists ?? []) byId[s.id] = (byId[s.id] ?? 0) + 1;
    }
    return { any, byId };
  }, [slots]);

  // Keep the chosen day valid: an old date (restored cart, page left open overnight) resets to today.
  useEffect(() => {
    if (!isUser) return;
    if (bookingForm.bookingDate !== todayIso && bookingForm.bookingDate !== tomorrowIso) {
      dispatch(setCustomerBookingField({ field: "bookingDate", value: todayIso }));
    }
  }, [bookingForm.bookingDate, dispatch, isUser, todayIso, tomorrowIso]);

  const refreshLoyaltySnapshot = useCallback(() => {
    void loadLoyalty({ force: true })
      .then((data) => {
        setWalletBalance(Number(data?.walletBalance ?? 0));
        setIsFirstTimeCustomer(Boolean(data?.isFirstTimeCustomer));
        setFirstBookingDiscountPercent(Number(data?.firstBookingDiscountPercent ?? 0));
      })
      .catch(() => undefined);
  }, []);

  // Load everything once.
  useEffect(() => {
    if (!isUser) return;
    void dispatch(fetchCustomerStylists());
    void dispatch(fetchCustomerServices());
    void dispatch(fetchCustomerOffers());
    refreshLoyaltySnapshot();
    void fetchUnclaimedVouchers().then(setUnclaimedVouchers);
  }, [dispatch, isUser, refreshLoyaltySnapshot]);

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);

  useEffect(() => {
    if (!bookingForm.serviceIds.length || !bookingForm.startsAt) {
      dispatch(setCustomerRecommendedStylists([]));
      return;
    }
    void dispatch(fetchRecommendedStylists({ serviceIds: bookingForm.serviceIds, startsAt: bookingForm.startsAt, variantSelections: bookingForm.variantSelections }));
  }, [bookingForm.startsAt, bookingForm.serviceIds, bookingForm.variantSelections, dispatch]);

  const loadSlots = useCallback(() => {
    if (!bookingForm.serviceIds.length || !effectiveBookingDate) return undefined;
    return dispatch(fetchCustomerSlots({ serviceIds: bookingForm.serviceIds, date: effectiveBookingDate, variantSelections: bookingForm.variantSelections }));
  }, [effectiveBookingDate, bookingForm.serviceIds, bookingForm.variantSelections, dispatch]);
  // Slots load ahead while services are being picked, so they're usually ready when the customer
  // reaches the time step. A short debounce keeps rapid add/remove taps to one request.
  useEffect(() => {
    const timer = window.setTimeout(() => void loadSlots(), 200);
    return () => window.clearTimeout(timer);
  }, [loadSlots]);

  // The member rate depends on the customer's plan; keep the store's price estimate in step with it.
  useEffect(() => {
    dispatch(setCustomerMembershipSegment(appUser?.membershipSegment ?? "FREE"));
  }, [appUser?.membershipSegment, dispatch]);

  // Always keep a valid stylist once a time is chosen (the preferred one when they are free), so the
  // form can never look complete yet stay blocked.
  useEffect(() => {
    if (!selectedSlot || !stylistOptions.length) return;
    if (stylistOptions.some((item) => item.id === bookingForm.stylistId)) return;
    const preferred = stylistOptions.find((item) => item.id === preferredStylistId);
    dispatch(setCustomerBookingField({ field: "stylistId", value: (preferred ?? stylistOptions[0]).id }));
  }, [bookingForm.stylistId, dispatch, selectedSlot, stylistOptions, preferredStylistId]);

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
  const selectVariant = useCallback((serviceId, variant) => dispatch(setCustomerVariantSelection({ serviceId, variant })), [dispatch]);

  const firstBookingDiscountAmount = isFirstTimeCustomer ? Math.round(priceSummary.payableAmount * (firstBookingDiscountPercent / 100) * 100) / 100 : 0;
  const afterFirstBookingDiscount = Math.max(0, priceSummary.payableAmount - firstBookingDiscountAmount);

  // Not offered alongside a combo — see the matching guard in createCustomerBooking on the backend.
  const voucherServiceId = !bookingForm.comboId ? bookingForm.serviceIds.find((id) => unclaimedVouchers.has(id)) ?? null : null;
  const voucherServiceName = voucherServiceId ? unclaimedVouchers.get(voucherServiceId) : null;
  const voucherPriced = voucherServiceId ? (offers?.pricedServices ?? []).find((item) => item.serviceId === voucherServiceId) : null;
  const voucherService = voucherServiceId ? services.find((item) => item.id === voucherServiceId) : null;
  const voucherDiscountAmount = voucherServiceId && useVoucher ? Math.min(afterFirstBookingDiscount, Number(voucherPriced?.finalPrice ?? voucherService?.basePrice ?? 0)) : 0;
  const afterVoucherDiscount = Math.max(0, afterFirstBookingDiscount - voucherDiscountAmount);
  const walletRedeemAmount = useWalletCredit ? Math.min(walletBalance, afterVoucherDiscount) : 0;
  const finalPayableAmount = Math.max(0, afterVoucherDiscount - walletRedeemAmount);

  function refreshAfterBooking() {
    setConfirmed(snapshotRef.current ?? {});
    dispatch(resetCustomerBookingForm());
    dispatch(setCustomerBookingField({ field: "bookingDate", value: todayIso }));
    setUseWalletCredit(false);
    setPreferredStylistId("");
    setStep(0);
    setMaxStep(0);
    void dispatch(fetchCustomerBookings());
    void fetchUnclaimedVouchers().then(setUnclaimedVouchers);
    refreshLoyaltySnapshot();
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
    setDirection(next >= step ? 1 : -1);
    setStep(next);
    setMaxStep((current) => Math.max(current, next));
    haptic("tap");
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  if (loading) {
    return (
      <UserLayout pageTitle="Book">
        <BrandLoader className="py-24" label="Loading" />
      </UserLayout>
    );
  }

  if (confirmed) {
    return (
      <UserLayout pageTitle="Booked">
        <BookingSuccess booked={confirmed} canInvite={Boolean(referralLink)} onInvite={openInvite} onBookAnother={() => setConfirmed(null)} />
      </UserLayout>
    );
  }

  const totalSavings = Number(priceSummary.discountAmount ?? 0) + firstBookingDiscountAmount + voucherDiscountAmount;
  const cancellation = describeCancellationWindows(bookingForm.startsAt);
  const busy = mutating || payPhase !== "idle" || watching;
  const slotGone = Boolean(bookingForm.startsAt) && !selectedSlot && !slotsLoading;
  const timeReady = Boolean(selectedSlot) && Boolean(selectedStylist);
  const whenLabel = bookingForm.startsAt ? `${dayLabel(effectiveBookingDate)} · ${salonTimeLabel(bookingForm.startsAt)}` : "";

  // One place decides whether "continue" is enabled and, if not, says why.
  let blocker = null;
  if (step === 0 && !bookingForm.serviceIds.length) blocker = "Pick at least one service";
  else if (step === 2 && !timeReady) blocker = slotGone ? "That time was just taken. Pick another" : "Choose a time";
  else if (step >= 3 && !timeReady) blocker = "Choose a time first";

  const payLabel = payPhase === "verifying" ? "Verifying payment" : payPhase === "checkout" ? "Finish paying in the window" : watching && payPhase === "idle" ? "Checking payment" : "Preparing payment";

  const unitPrice = (service) => {
    const priced = (offers?.pricedServices ?? []).find((item) => item.serviceId === service.id);
    const percent = Number(priced?.appliedPercent ?? 0);
    return Math.max(0, Math.round(Number(service.basePrice ?? 0) * (1 - percent / 100) * 100) / 100);
  };

  const breakdownLines = [
    { id: "subtotal", label: "Subtotal", amount: priceSummary.totalAmount, icon: ReceiptText },
    priceSummary.discountAmount > 0 && { id: "offer", label: priceSummary.offerLabel ?? "Offer", amount: priceSummary.discountAmount, icon: BadgePercent, tone: "saving" },
    firstBookingDiscountAmount > 0 && { id: "first", label: "First booking", amount: firstBookingDiscountAmount, icon: Sparkles, tone: "saving" },
    voucherDiscountAmount > 0 && { id: "voucher", label: "Voucher", amount: voucherDiscountAmount, icon: Ticket, tone: "saving" },
    walletRedeemAmount > 0 && { id: "wallet", label: "Wallet", amount: walletRedeemAmount, icon: Wallet, tone: "saving" },
  ].filter(Boolean);

  const backButton =
    step > 0 && !busy ? (
      <motion.button type="button" whileTap={reduce ? undefined : interaction.press} aria-label="Back" onClick={() => goTo(step - 1)} className="grid size-12 shrink-0 place-items-center rounded-control bg-secondary">
        <ArrowLeft className="size-5" aria-hidden />
      </motion.button>
    ) : null;

  const actions =
    step < 4 ? (
      <div className="flex items-center gap-2">
        {backButton}
        <motion.button
          type="button"
          whileTap={reduce || blocker ? undefined : interaction.press}
          disabled={Boolean(blocker)}
          onClick={() => goTo(step + 1)}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-control bg-portal px-5 font-semibold text-portal-foreground shadow-soft transition-opacity hover:shadow-glow disabled:opacity-45"
        >
          {NEXT_LABEL[step]} <ArrowRight className="size-5" aria-hidden />
        </motion.button>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        {backButton}
        {busy ? (
          <div role="status" className="flex h-[3.75rem] flex-1 items-center justify-center gap-3 rounded-full bg-portal/10 text-sm font-semibold text-portal">
            <BrandDots /> {payLabel}
          </div>
        ) : (
          <SlideToConfirm
            key={`${finalPayableAmount}-${bookingForm.startsAt}`}
            className="flex-1"
            disabled={Boolean(blocker)}
            label={finalPayableAmount > 0 ? `Slide to pay ${money(finalPayableAmount)}` : "Slide to confirm"}
            confirmedLabel={finalPayableAmount > 0 ? "Opening payment" : "Booking"}
            icon={finalPayableAmount > 0 ? CreditCard : undefined}
            onConfirm={() => createBooking()}
          />
        )}
      </div>
    );

  const cartChips =
    step === 0 && selectedServices.length ? (
      <ul aria-label="Selected services" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        <AnimatePresence initial={false} mode="popLayout">
          {selectedServices.map((service) => (
            <motion.li
              key={service.id}
              layout={!reduce}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              transition={spring.bouncy}
              className="flex shrink-0 items-center gap-1 rounded-full bg-portal/12 py-1 pr-1 pl-3 text-caption font-semibold text-portal"
            >
              <span className="max-w-[9rem] truncate">{service.name}</span>
              <button type="button" aria-label={`Remove ${service.name}`} onClick={() => toggleService(service.id, false)} className="tap grid size-6 place-items-center rounded-full bg-card">
                <X className="size-3.5" aria-hidden />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    ) : null;

  return (
    <UserLayout pageTitle="Book" subtitle={STEPS[step].label}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className={cn("min-w-0 space-y-6 lg:pb-0", selectedServices.length || step > 0 ? "pb-56" : "pb-4")}>
          <AnimatedStepper steps={STEPS} current={step} onStepClick={(i) => i <= maxStep && goTo(i)} />

          <AnimatePresence>
            {bookingForm.comboId ? (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.soft} className="flex items-center gap-3 rounded-card bg-success/12 p-3 text-sm font-semibold text-ink-success">
                <Gift className="size-5 shrink-0" aria-hidden />
                {priceSummary.offerLabel ?? "Combo offer applied"}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false} custom={direction}>
            {step === 0 ? (
              <StepPanel stepKey="services" direction={direction}>
                <CustomerServicePicker
                  services={services}
                  loading={servicesLoading}
                  selectedIds={bookingForm.serviceIds}
                  pricedServices={offers?.pricedServices}
                  variantSelections={bookingForm.variantSelections}
                  membershipSegment={appUser?.membershipSegment}
                  expandedId={detailsServiceId}
                  onSelectVariant={selectVariant}
                  onToggle={toggleService}
                  onOpenDetails={openServiceDetails}
                />
              </StepPanel>
            ) : null}

            {step === 1 ? (
              <StepPanel stepKey="stylist" direction={direction}>
                <SectionHeading icon={Users} title="Who would you like?" />
                <StylistPicker
                  stylists={stylists}
                  value={preferredStylistId}
                  loading={!stylists.length}
                  freeCounts={freeCounts}
                  dayLabel={effectiveBookingDate === todayIso ? "today" : "tomorrow"}
                  onChange={(id) => {
                    setPreferredStylistId(id);
                    // A different stylist may not be free at the time already picked.
                    if (bookingForm.startsAt && id && !selectedSlot?.stylists?.some((s) => s.id === id)) {
                      dispatch(setCustomerBookingField({ field: "startsAt", value: "" }));
                    } else if (bookingForm.startsAt && id) {
                      dispatch(setCustomerBookingField({ field: "stylistId", value: id }));
                    }
                  }}
                />
              </StepPanel>
            ) : null}

            {step === 2 ? (
              <StepPanel stepKey="time" direction={direction}>
                <div className="space-y-6">
                  <DayTabs
                    days={[todayIso, tomorrowIso]}
                    value={effectiveBookingDate}
                    onChange={(iso) => dispatch(setCustomerBookingField({ field: "bookingDate", value: iso }))}
                    label="Day"
                  />
                  <div>
                    <SectionHeading
                      icon={CalendarClock}
                      title="Time"
                      trailing={
                        preferredStylist ? (
                          <span className="inline-flex max-w-[45%] items-center gap-1.5 truncate rounded-full bg-muted px-2.5 py-1 text-caption font-semibold">
                            <Avatar name={preferredStylist.name} size="xs" /> <span className="truncate">{preferredStylist.name}</span>
                          </span>
                        ) : null
                      }
                    />
                    <TimeSlotPicker
                      slots={slotsForPicker}
                      value={bookingForm.startsAt}
                      onChange={(value) => dispatch(setCustomerBookingField({ field: "startsAt", value }))}
                      loading={slotsLoading}
                      durationMinutes={totalDurationMinutes}
                      empty={
                        <EmptyState
                          illustration="calendar"
                          title="No free times"
                          compact
                          action={
                            effectiveBookingDate === todayIso ? (
                              <button type="button" onClick={() => dispatch(setCustomerBookingField({ field: "bookingDate", value: tomorrowIso }))} className="inline-flex h-11 items-center gap-2 rounded-control bg-portal px-5 text-sm font-semibold text-portal-foreground">
                                <CalendarX className="size-4" aria-hidden /> Try tomorrow
                              </button>
                            ) : null
                          }
                        />
                      }
                    />
                  </div>

                  <AnimatePresence>
                    {selectedSlot && stylistOptions.length > 1 ? (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.soft}>
                        <SectionHeading icon={UserRound} title="Free at this time" />
                        <div role="radiogroup" aria-label="Stylist at this time" className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] py-1">
                          {stylistOptions.map((stylist) => {
                            const active = stylist.id === bookingForm.stylistId;
                            return (
                              <button
                                key={stylist.id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => {
                                  haptic("tap");
                                  dispatch(setCustomerBookingField({ field: "stylistId", value: stylist.id }));
                                }}
                                className={cn("flex h-12 shrink-0 items-center gap-2 rounded-full pr-4 pl-1.5 text-sm font-semibold ring-1 ring-inset transition-colors", active ? "bg-portal/12 text-portal ring-2 ring-portal" : "bg-card ring-border/70")}
                              >
                                <Avatar name={stylist.name} size="sm" />
                                {stylist.name}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </StepPanel>
            ) : null}

            {step === 3 ? (
              <StepPanel stepKey="review" direction={direction}>
                <div className="space-y-4">
                  <div className="space-y-1 rounded-card bg-card p-4 ring-1 ring-inset ring-border/60">
                    {selectedServices.map((service) => {
                      const original = Number(service.basePrice ?? 0);
                      const final = unitPrice(service);
                      const Icon = iconForCategory(service.category ?? "");
                      return (
                        <div key={service.id} className="flex items-center gap-3 p-2">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-portal/12 text-portal">
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{service.name}</span>
                            <span className="block text-caption text-ink-neutral">{service.duration} min</span>
                          </span>
                          <span className="flex shrink-0 items-baseline gap-1.5 text-sm font-semibold tabular-nums">
                            {final < original ? <span className="text-caption font-normal text-ink-neutral line-through">{money(original)}</span> : null}
                            {money(final)}
                          </span>
                        </div>
                      );
                    })}
                    <div className="my-1 border-t border-dashed border-border" />
                    <EditRow icon={CalendarClock} onClick={() => goTo(2)} label="Change date and time">
                      {whenLabel || "Pick a time"}
                    </EditRow>
                    <EditRow icon={UserRound} onClick={() => goTo(1)} label="Change stylist">
                      {selectedStylist?.name ?? "Any stylist"}
                    </EditRow>
                  </div>

                  {isFirstTimeCustomer && firstBookingDiscountPercent > 0 ? (
                    <div className="flex items-center gap-3 rounded-card bg-success/12 p-4 text-sm font-semibold text-ink-success">
                      <Sparkles className="size-5 shrink-0" aria-hidden />
                      {firstBookingDiscountPercent}% off your first booking
                    </div>
                  ) : null}
                  {voucherServiceId ? (
                    <ToggleRow icon={Ticket} tone="gold" title="Free-service voucher" hint={voucherServiceName} checked={useVoucher} onChange={setUseVoucher} amount={voucherDiscountAmount} />
                  ) : null}
                  {walletBalance > 0 && afterVoucherDiscount > 0 ? (
                    <ToggleRow icon={Wallet} title="Wallet credit" hint={`${money(walletBalance)} available`} checked={useWalletCredit} onChange={setUseWalletCredit} amount={walletRedeemAmount} />
                  ) : null}

                  <UserPriceBreakdown lines={breakdownLines} total={finalPayableAmount} totalLabel={totalSavings > 0 ? `Total · you save ${money(totalSavings)}` : "Total"} />
                </div>
              </StepPanel>
            ) : null}

            {step === 4 ? (
              <StepPanel stepKey="pay" direction={direction}>
                <div className="space-y-4">
                  <div className="relative overflow-hidden isolate rounded-card bg-card p-6 text-center ring-1 ring-inset ring-border/60">
                    <p className="relative z-[2] text-caption font-semibold text-ink-neutral">{finalPayableAmount > 0 ? "To pay now" : "Nothing to pay"}</p>
                    <p className="relative z-[2] mt-1 font-display text-display-xl leading-none font-bold text-gradient-portal tabular-nums">{money(finalPayableAmount)}</p>
                    <p className="relative z-[2] mt-3 text-sm font-medium">{whenLabel}{selectedStylist ? ` · ${selectedStylist.name}` : ""}</p>
                    {finalPayableAmount > 0 ? (
                      <p className="relative z-[2] mt-3 inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-caption font-semibold text-ink-neutral">
                        <ShieldCheck className="size-3.5 text-ink-success" aria-hidden /> UPI, cards and netbanking via Razorpay
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2 rounded-card bg-card p-4 ring-1 ring-inset ring-border/60">
                    <h3 className="flex items-center gap-2 px-1 text-sm font-semibold">
                      <ShieldCheck className="size-4 text-portal" aria-hidden /> If plans change
                    </h3>
                    <ul className="space-y-1.5">
                      {cancellation.tiers.map((tier) => {
                        const meta = REFUND_META[tier.key];
                        const Icon = meta.icon;
                        const isCurrent = tier.key === cancellation.current;
                        return (
                          <li key={tier.key} className={cn("flex items-start gap-3 rounded-2xl p-3", isCurrent ? meta.tone : "bg-muted/50", !tier.available && "opacity-50")}>
                            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2 text-sm font-semibold">
                                {tier.title}
                                {isCurrent ? <span className="rounded-full bg-card px-2 py-0.5 text-micro font-bold uppercase">Now</span> : null}
                              </span>
                              <span className="block text-caption opacity-90">{tier.when}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <AnimatePresence>
                    {payStatus && payStatus.state !== "CONFIRMED" && payStatus.state !== "AWAITING_PAYMENT" ? (
                      <motion.div
                        role="status"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={spring.soft}
                        className={cn("flex items-start gap-3 rounded-card p-4 text-sm", ["FAILED", "EXPIRED", "REFUNDING", "REFUNDED"].includes(payStatus.state) ? "bg-destructive/12" : "bg-muted")}
                      >
                        {watching ? <BrandDots className="mt-1" /> : <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />}
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
                          {payStatus.message ? <p className="mt-0.5 text-ink-neutral">{payStatus.message}</p> : null}
                          {(payStatus.state === "PENDING" || payStatus.state === "PROCESSING") && !watching ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button type="button" onClick={() => payStatus.orderId && void watchPayment(payStatus.orderId)} className="inline-flex h-10 items-center gap-1.5 rounded-control bg-card px-3.5 text-sm font-semibold">
                                <RefreshCw className="size-4" aria-hidden /> Check again
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  clearPendingPayment();
                                  setPayStatus(null);
                                }}
                                className="inline-flex h-10 items-center rounded-control px-3.5 text-sm font-semibold hover:bg-card"
                              >
                                Dismiss
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </StepPanel>
            ) : null}
          </AnimatePresence>
        </div>

        <BookingAside
          services={selectedServices}
          priceOf={unitPrice}
          canRemove={step === 0}
          onRemove={(id) => toggleService(id, false)}
          when={whenLabel}
          stylist={selectedStylist?.name ?? (preferredStylist?.name || null)}
          savings={totalSavings}
          wallet={walletRedeemAmount}
          total={finalPayableAmount}
          blocker={blocker}
          refundNote={bookingForm.startsAt && cancellation.current !== "NONE" ? cancellation.tiers.find((t) => t.key === cancellation.current)?.when : null}
          actions={actions}
        />
      </div>

      <CartBar
        visible={selectedServices.length > 0 || step > 0}
        count={selectedServices.length}
        total={finalPayableAmount}
        caption={`${selectedServices.length} service${selectedServices.length === 1 ? "" : "s"}${step > 1 && bookingForm.startsAt ? ` · ${salonTimeLabel(bookingForm.startsAt)}` : ""}`}
        blocker={blocker}
        chips={cartChips}
        actions={actions}
      />

      <ServiceDetailsSheet
        open={Boolean(detailsServiceId)}
        state={detailService ? "ready" : servicesLoading || (!services.length && !error) ? "loading" : "missing"}
        service={detailService}
        selected={detailService ? bookingForm.serviceIds.includes(detailService.id) : false}
        priced={detailService ? (offers?.pricedServices ?? []).find((item) => item.serviceId === detailService.id) : null}
        fallbackIcon={detailService ? iconForCategory(detailService.category ?? "") : undefined}
        variant={detailService ? bookingForm.variantSelections?.[detailService.id] : undefined}
        membershipSegment={appUser?.membershipSegment}
        layoutId={detailService && step === 0 ? `service-card-${detailService.id}` : undefined}
        onToggle={toggleService}
        onSelectVariant={selectVariant}
        onClose={closeServiceDetails}
      />
    </UserLayout>
  );
}
