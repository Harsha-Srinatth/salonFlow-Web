"use client";

import { AnimatedStepper, ButtonLoadingMorph, SlideToConfirm } from "@/components/kit";
import { SuccessBurst } from "@/components/motion";
import { spring } from "@/components/motion/presets";
import { salonDateIso } from "@/lib/salon-date";
import { notify } from "@/lib/notify";
import { formatCurrency } from "@/receptionist/lib/booking-utils";
import { ConfirmStep, CustomerStep, ServicesStep, TimeStep } from "@/receptionist/components/walk-in-steps";
import { RECEPTION_HOME } from "@/receptionist/portal/nav-config";
import {
  applyReceptionComboOffer,
  clearReceptionComboOffer,
  createReceptionBookingAsync,
  fetchReceptionOffers,
  fetchReceptionQueue,
  fetchReceptionSlots,
  lookupReceptionCustomerAsync,
  resetReceptionBookingForm,
  setReceptionBookingFormField,
} from "@/store/reception-bookings-slice";
import { ArrowLeft, ArrowRight, CalendarClock, ClipboardCheck, ListChecks, Plus, Sparkles, UserRound } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const STEPS = [
  { id: "customer", label: "Customer", icon: UserRound },
  { id: "services", label: "Services", icon: Sparkles },
  { id: "time", label: "Time", icon: CalendarClock },
  { id: "confirm", label: "Confirm", icon: ClipboardCheck },
];

/**
 * Walk-in booking as a 4-step flow: customer (instant lookup by phone/email) → services and offers →
 * date strip + time slots + stylist → summary with slide-to-book. The Redux form, lookups, slot
 * fetches and create call are unchanged from the old single-page form.
 */
export function WalkInWizard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [lockMatchedCustomer, setLockMatchedCustomer] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [created, setCreated] = useState(null);
  const topRef = useRef(null);
  const {
    stylists,
    services,
    servicesLoading,
    servicesError,
    slots,
    bookingForm,
    priceSummary,
    customerLookup,
    customerLookupLoading,
    offers,
    offersLoading,
  } = useSelector((state) => state.receptionBookings);

  const membershipSegment = bookingForm.membershipSegment ?? "FREE";
  const membershipPlanName = offers?.membershipPlanName;
  // Salon-local dates: the UTC date is still "yesterday" in India until 05:30.
  const todayIso = salonDateIso(0);
  const tomorrowIso = salonDateIso(1);
  const effectiveBookingDate = bookingForm.bookingDate || todayIso;
  const setField = (field, value) => dispatch(setReceptionBookingFormField({ field, value }));

  useEffect(() => {
    void dispatch(fetchReceptionOffers(membershipSegment));
  }, [dispatch, membershipSegment]);

  useEffect(() => {
    if (!bookingForm.bookingDate) dispatch(setReceptionBookingFormField({ field: "bookingDate", value: todayIso }));
  }, [bookingForm.bookingDate, dispatch, todayIso]);

  useEffect(() => {
    if (!bookingForm.serviceIds?.length || !bookingForm.customerGender) return undefined;
    let alive = true;
    setSlotsLoading(true);
    void dispatch(
      fetchReceptionSlots({
        serviceIds: bookingForm.serviceIds,
        date: effectiveBookingDate,
        customerGender: bookingForm.customerGender,
        variantSelections: bookingForm.variantSelections,
      })
    ).finally(() => alive && setSlotsLoading(false));
    return () => {
      alive = false;
    };
  }, [bookingForm.customerGender, bookingForm.serviceIds, bookingForm.variantSelections, dispatch, effectiveBookingDate]);

  const selectedSlot = useMemo(() => slots.find((slot) => slot.startsAt === bookingForm.startsAt) ?? null, [slots, bookingForm.startsAt]);

  useEffect(() => {
    if (!selectedSlot?.stylists?.length) return;
    if (!selectedSlot.stylists.some((item) => item.id === bookingForm.stylistId)) {
      dispatch(setReceptionBookingFormField({ field: "stylistId", value: selectedSlot.stylists[0].id }));
    }
  }, [bookingForm.stylistId, dispatch, selectedSlot]);

  // Instant customer lookup (debounced) as phone/email are typed.
  useEffect(() => {
    const email = bookingForm.customerEmail?.trim() ?? "";
    const phone = bookingForm.customerPhone?.trim() ?? "";
    if (!email && !phone) return undefined;
    const timer = window.setTimeout(() => {
      void dispatch(lookupReceptionCustomerAsync({ email, phone }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [bookingForm.customerEmail, bookingForm.customerPhone, dispatch]);

  useEffect(() => {
    if (customerLookup.status !== "EXISTING_CUSTOMER" || !customerLookup.customer) setLockMatchedCustomer(false);
  }, [customerLookup.customer, customerLookup.status]);

  useEffect(() => {
    if (!lockMatchedCustomer || customerLookup.status !== "EXISTING_CUSTOMER" || !customerLookup.customer) return;
    dispatch(setReceptionBookingFormField({ field: "customerName", value: customerLookup.customer.name ?? "" }));
    dispatch(setReceptionBookingFormField({ field: "customerEmail", value: customerLookup.customer.email ?? "" }));
    dispatch(setReceptionBookingFormField({ field: "customerPhone", value: customerLookup.customer.phone ?? "" }));
    // UNSPECIFIED means the account has never been asked — leave the field blank
    // so reception has to answer it rather than confirming a placeholder.
    const storedGender = customerLookup.customer.gender;
    if (storedGender && storedGender !== "UNSPECIFIED") {
      dispatch(setReceptionBookingFormField({ field: "customerGender", value: storedGender }));
    }
  }, [customerLookup.customer, customerLookup.status, dispatch, lockMatchedCustomer]);

  function toggleService(serviceId, checked) {
    const current = bookingForm.serviceIds ?? [];
    const next = checked ? Array.from(new Set([...current, serviceId])) : current.filter((id) => id !== serviceId);
    setField("serviceIds", next);
  }

  const conflict = customerLookup.status === "CONFLICT_NON_CUSTOMER_ACCOUNT";
  const stepValid = [
    Boolean(bookingForm.customerGender) && !conflict && !customerLookupLoading,
    services.length > 0 && Boolean(bookingForm.serviceIds?.length),
    Boolean(bookingForm.startsAt) && Boolean(bookingForm.stylistId),
    true,
  ];
  const stylistOptions = selectedSlot?.stylists?.length ? selectedSlot.stylists : stylists;
  const stylistName = stylistOptions.find((s) => s.id === bookingForm.stylistId)?.name;

  const goTo = (i) => {
    setDirection(i > step ? 1 : -1);
    setStep(i);
    topRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  async function createBooking() {
    if (conflict) {
      notify.error("Phone/email belongs to a staff/admin account. Use customer details.");
      throw new Error("conflict");
    }
    if (!bookingForm.customerGender) {
      notify.error("Select the customer's gender");
      throw new Error("gender");
    }
    const payload = {
      customerName: bookingForm.customerName,
      customerEmail: bookingForm.customerEmail,
      customerPhone: bookingForm.customerPhone,
      customerGender: bookingForm.customerGender,
      serviceIds: bookingForm.serviceIds,
      variantSelections: bookingForm.variantSelections,
      stylistId: bookingForm.stylistId,
      startsAt: bookingForm.startsAt,
      paymentMode: bookingForm.paymentMode,
      comboId: bookingForm.comboId || undefined,
      membershipSegment: bookingForm.membershipSegment ?? "FREE",
    };
    const result = await dispatch(createReceptionBookingAsync(payload));
    if (createReceptionBookingAsync.rejected.match(result)) {
      notify.error(result.payload ?? "Could not create booking");
      throw new Error("create failed");
    }
    const summary = { name: bookingForm.customerName || "Walk-in", amount: priceSummary.payableAmount ?? 0, stylistName };
    notify.success("Walk-in booked", { description: `${summary.name} · ${formatCurrency(summary.amount)}` });
    dispatch(resetReceptionBookingForm());
    dispatch(setReceptionBookingFormField({ field: "bookingDate", value: todayIso }));
    void dispatch(fetchReceptionOffers("FREE"));
    void dispatch(fetchReceptionQueue());
    setTimeout(() => setCreated(summary), 450);
  }

  function startOver() {
    setCreated(null);
    setLockMatchedCustomer(false);
    setDirection(-1);
    setStep(0);
  }

  if (created) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring.soft} className="relative overflow-hidden mx-auto flex max-w-md flex-col items-center gap-4 rounded-card border border-border/60 bg-card px-6 py-10 text-center shadow-soft">
        <div className="relative z-[2] flex flex-col items-center gap-3">
          <SuccessBurst size={96} label="Booking created" />
          <h2 className="font-display text-title font-bold">Booked!</h2>
          <p className="text-ink-neutral">
            {created.name}
            {created.stylistName ? ` · ${created.stylistName}` : ""}
          </p>
          <p className="font-display text-display-lg font-bold tabular-nums">{formatCurrency(created.amount)}</p>
          <div className="mt-2 grid w-full grid-cols-2 gap-2">
            <ButtonLoadingMorph variant="outline" icon={ListChecks} onClick={() => navigate(RECEPTION_HOME)}>
              Queue
            </ButtonLoadingMorph>
            <ButtonLoadingMorph icon={Plus} onClick={startOver}>
              Next walk-in
            </ButtonLoadingMorph>
          </div>
        </div>
      </motion.div>
    );
  }

  const stepProps = [
    <CustomerStep
      key="customer"
      form={bookingForm}
      setField={setField}
      lookup={customerLookup}
      lookupLoading={customerLookupLoading}
      locked={lockMatchedCustomer}
      onToggleLock={() => setLockMatchedCustomer((v) => !v)}
      planName={membershipPlanName}
    />,
    <ServicesStep
      key="services"
      services={services}
      servicesLoading={servicesLoading}
      servicesError={servicesError}
      offers={offers}
      offersLoading={offersLoading}
      form={bookingForm}
      membershipSegment={membershipSegment}
      planName={membershipPlanName}
      onToggleService={toggleService}
      onSelectVariant={(serviceId, variant) => setField("variantSelections", { ...(bookingForm.variantSelections ?? {}), [serviceId]: variant })}
      onApplyCombo={(combo) => dispatch(applyReceptionComboOffer(combo))}
      onClearCombo={() => dispatch(clearReceptionComboOffer())}
    />,
    <TimeStep
      key="time"
      form={bookingForm}
      todayIso={todayIso}
      tomorrowIso={tomorrowIso}
      slots={slots}
      slotsLoading={slotsLoading}
      stylistOptions={stylistOptions}
      onDate={(iso) => setField("bookingDate", iso)}
      onSlot={(startsAt) => setField("startsAt", startsAt)}
      onStylist={(id) => setField("stylistId", id)}
    />,
    <ConfirmStep key="confirm" form={bookingForm} services={services} stylistName={stylistName} priceSummary={priceSummary} onPaymentMode={(v) => setField("paymentMode", v)} />,
  ];

  const offset = reduce ? 0 : 28;
  const isLast = step === STEPS.length - 1;
  const allValid = stepValid.slice(0, 3).every(Boolean);

  return (
    <div ref={topRef} className="mx-auto max-w-5xl scroll-mt-[calc(var(--topbar-h)+1rem)] space-y-5">
      <div className="rounded-card border border-border/60 bg-card px-4 py-4 shadow-soft sm:px-6">
        <AnimatedStepper steps={STEPS} current={step} onStepClick={goTo} />
      </div>

      <div className="relative min-h-[18rem] overflow-hidden rounded-card border border-border/60 bg-card p-4 shadow-soft sm:p-6">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={STEPS[step].id}
            custom={direction}
            initial={{ opacity: 0, x: direction * offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * offset }}
            transition={spring.soft}
          >
            <h2 className="mb-4 font-display text-title font-bold">{STEPS[step].label}</h2>
            {stepProps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="glass-strong sticky bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+0.5rem)] z-sticky flex items-center gap-2 rounded-card p-2 lg:bottom-4">
        {step > 0 ? (
          <ButtonLoadingMorph variant="ghost" icon={ArrowLeft} onClick={() => goTo(step - 1)} aria-label="Back" className="shrink-0">
            <span className="hidden sm:inline">Back</span>
          </ButtonLoadingMorph>
        ) : null}
        <div className="min-w-0 flex-1">
          {isLast ? (
            <SlideToConfirm
              tone="gold"
              label={`Slide to book · ${formatCurrency(priceSummary.payableAmount ?? 0)}`}
              confirmedLabel="Booked"
              disabled={!allValid}
              onConfirm={createBooking}
              resetAfter={null}
            />
          ) : (
            <ButtonLoadingMorph fullWidth size="lg" disabled={!stepValid[step]} onClick={() => goTo(step + 1)}>
              Next <ArrowRight className="size-5" aria-hidden />
            </ButtonLoadingMorph>
          )}
        </div>
      </div>
    </div>
  );
}
