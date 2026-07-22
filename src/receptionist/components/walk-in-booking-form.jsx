"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceCatalogSelector } from "@/components/services/service-catalog-selector";
import { membershipSegmentBadgeClass, membershipSegmentLabel } from "@/lib/offers/offer-pricing";
import { ReceptionOffersPanel } from "@/receptionist/components/reception-offers-panel";
import { maskEmail, maskPhone } from "@/receptionist/lib/booking-utils";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Crown, IndianRupee, User, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

export function WalkInBookingForm({ layout = "default", onCreated }) {
  const dispatch = useDispatch();
  const [lockMatchedCustomer, setLockMatchedCustomer] = useState(false);
  const {
    stylists,
    services,
    servicesLoading,
    servicesError,
    slots,
    bookingForm,
    priceSummary,
    mutating,
    customerLookup,
    customerLookupLoading,
    offers,
    offersLoading,
  } = useSelector((state) => state.receptionBookings);

  const membershipSegment = bookingForm.membershipSegment ?? "FREE";
  const membershipPlanName = offers?.membershipPlanName;

  useEffect(() => {
    void dispatch(fetchReceptionOffers(membershipSegment));
  }, [dispatch, membershipSegment]);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const effectiveBookingDate = bookingForm.bookingDate || todayIso;
  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.startsAt === bookingForm.startsAt) ?? null,
    [slots, bookingForm.startsAt]
  );

  useEffect(() => {
    if (!bookingForm.bookingDate) {
      dispatch(setReceptionBookingFormField({ field: "bookingDate", value: todayIso }));
    }
  }, [bookingForm.bookingDate, dispatch, todayIso]);

  useEffect(() => {
    if (!bookingForm.serviceIds?.length) return;
    void dispatch(fetchReceptionSlots({ serviceIds: bookingForm.serviceIds, date: effectiveBookingDate }));
  }, [bookingForm.serviceIds, dispatch, effectiveBookingDate]);

  useEffect(() => {
    if (!selectedSlot?.stylists?.length) return;
    if (!selectedSlot.stylists.some((item) => item.id === bookingForm.stylistId)) {
      dispatch(setReceptionBookingFormField({ field: "stylistId", value: selectedSlot.stylists[0].id }));
    }
  }, [bookingForm.stylistId, dispatch, selectedSlot]);

  useEffect(() => {
    const email = bookingForm.customerEmail?.trim() ?? "";
    const phone = bookingForm.customerPhone?.trim() ?? "";
    if (!email && !phone) return;
    const timer = window.setTimeout(() => {
      void dispatch(lookupReceptionCustomerAsync({ email, phone }));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [bookingForm.customerEmail, bookingForm.customerPhone, dispatch]);

  useEffect(() => {
    if (customerLookup.status !== "EXISTING_CUSTOMER" || !customerLookup.customer) {
      setLockMatchedCustomer(false);
    }
  }, [customerLookup.customer, customerLookup.status]);

  useEffect(() => {
    if (!lockMatchedCustomer || customerLookup.status !== "EXISTING_CUSTOMER" || !customerLookup.customer) return;
    dispatch(setReceptionBookingFormField({ field: "customerName", value: customerLookup.customer.name ?? "" }));
    dispatch(setReceptionBookingFormField({ field: "customerEmail", value: customerLookup.customer.email ?? "" }));
    dispatch(setReceptionBookingFormField({ field: "customerPhone", value: customerLookup.customer.phone ?? "" }));
  }, [customerLookup.customer, customerLookup.status, dispatch, lockMatchedCustomer]);

  function toggleService(serviceId, checked) {
    const current = bookingForm.serviceIds ?? [];
    const next = checked
      ? Array.from(new Set([...current, serviceId]))
      : current.filter((id) => id !== serviceId);
    dispatch(setReceptionBookingFormField({ field: "serviceIds", value: next }));
  }

  async function createBooking() {
    if (customerLookup.status === "CONFLICT_NON_CUSTOMER_ACCOUNT") {
      toast.error("Phone/email belongs to staff/admin account. Please enter valid customer details.");
      return;
    }
    const payload = {
      customerName: bookingForm.customerName,
      customerEmail: bookingForm.customerEmail,
      customerPhone: bookingForm.customerPhone,
      serviceIds: bookingForm.serviceIds,
      stylistId: bookingForm.stylistId,
      startsAt: bookingForm.startsAt,
      paymentMode: bookingForm.paymentMode,
      comboId: bookingForm.comboId || undefined,
      membershipSegment: bookingForm.membershipSegment ?? "FREE",
    };
    const result = await dispatch(createReceptionBookingAsync(payload));
    if (createReceptionBookingAsync.rejected.match(result)) {
      toast.error(result.payload ?? "Could not create booking");
      return;
    }
    toast.success("Walk-in booking created");
    dispatch(resetReceptionBookingForm());
    dispatch(setReceptionBookingFormField({ field: "bookingDate", value: todayIso }));
    void dispatch(fetchReceptionOffers("FREE"));
    void dispatch(fetchReceptionQueue());
    onCreated?.();
  }

  const slotValue = slots.some((slot) => slot.startsAt === bookingForm.startsAt)
    ? bookingForm.startsAt
    : undefined;

  const isPageLayout = layout === "page";

  const customerSection = (
    <>
      <div className="space-y-2">
        <Label htmlFor="customerName" className="flex items-center gap-2">
          <User className="size-4" />
          Customer name
        </Label>
        <Input
          id="customerName"
          disabled={lockMatchedCustomer}
          value={bookingForm.customerName}
          onChange={(e) => dispatch(setReceptionBookingFormField({ field: "customerName", value: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="customerPhone">Phone</Label>
        <Input
          id="customerPhone"
          disabled={lockMatchedCustomer}
          value={bookingForm.customerPhone}
          onChange={(e) => dispatch(setReceptionBookingFormField({ field: "customerPhone", value: e.target.value }))}
        />
      </div>
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="customerEmail">Email</Label>
        <Input
          id="customerEmail"
          disabled={lockMatchedCustomer}
          type="email"
          value={bookingForm.customerEmail}
          onChange={(e) => dispatch(setReceptionBookingFormField({ field: "customerEmail", value: e.target.value }))}
        />
        {customerLookupLoading ? <p className="text-xs text-muted-foreground">Checking customer…</p> : null}
        {!customerLookupLoading && (bookingForm.customerEmail || bookingForm.customerPhone) ? (
          <p
            className={`text-xs ${
              customerLookup.status === "EXISTING_CUSTOMER"
                ? "text-emerald-600"
                : customerLookup.status === "CONFLICT_NON_CUSTOMER_ACCOUNT"
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {customerLookup.status === "EXISTING_CUSTOMER"
              ? `Existing customer: ${customerLookup.customer?.name ?? "Customer"}`
              : customerLookup.status === "CONFLICT_NON_CUSTOMER_ACCOUNT"
                ? "Staff/admin account detected — use different details."
                : "New customer will be created automatically."}
          </p>
        ) : null}
      </div>
      {customerLookup.status === "EXISTING_CUSTOMER" && customerLookup.customer ? (
        <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Matched customer
            </p>
            <Badge
              variant="outline"
              className={cn("gap-1", membershipSegmentBadgeClass(customerLookup.customer.membershipSegment))}
            >
              <Crown className="size-3" />
              {membershipPlanName ??
                membershipSegmentLabel(customerLookup.customer.membershipSegment ?? "FREE")}
            </Badge>
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>{customerLookup.customer.name ?? "—"}</p>
            <p className="text-muted-foreground">{maskEmail(customerLookup.customer.email)}</p>
            <p className="text-muted-foreground">{maskPhone(customerLookup.customer.phone)}</p>
            <p className="text-muted-foreground">
              Account: {customerLookup.customer.accountStatus ?? "—"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={lockMatchedCustomer ? "default" : "outline"}
            onClick={() => setLockMatchedCustomer((prev) => !prev)}
          >
            {lockMatchedCustomer ? "Customer locked" : "Use this customer"}
          </Button>
        </div>
      ) : null}
      {customerLookup.status === "NEW_CUSTOMER" &&
      (bookingForm.customerEmail || bookingForm.customerPhone) &&
      !customerLookupLoading ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-3 text-sm lg:col-span-2">
          <Badge variant="outline" className={cn("gap-1", membershipSegmentBadgeClass("FREE"))}>
            <Crown className="size-3" />
            Free member (new customer)
          </Badge>
          <p className="mt-2 text-xs text-muted-foreground">
            Global and service offers for free customers will apply to this booking.
          </p>
        </div>
      ) : null}
    </>
  );

  const servicesSection = (
    <div className="space-y-6">
      <ReceptionOffersPanel
        offers={offers}
        membershipSegment={membershipSegment}
        membershipPlanName={membershipPlanName}
        selectedComboId={bookingForm.comboId}
        loading={offersLoading}
        onApplyCombo={(combo) => dispatch(applyReceptionComboOffer(combo))}
        onClearCombo={() => dispatch(clearReceptionComboOffer())}
      />
      <div className="space-y-3">
        {servicesLoading ? <p className="text-xs text-muted-foreground">Loading services…</p> : null}
        {servicesError ? <p className="text-sm text-destructive">{servicesError}</p> : null}
        <div className={isPageLayout ? "[&_.grid]:md:grid-cols-2 [&_.grid]:2xl:grid-cols-3" : ""}>
          <ServiceCatalogSelector
            services={services}
            mode="multi"
            label="Choose services"
            selectedServiceIds={bookingForm.serviceIds ?? []}
            onToggleServiceId={toggleService}
            pricedServices={offers?.pricedServices}
          />
        </div>
      </div>
    </div>
  );

  const scheduleSection = (
    <>
      <div className="space-y-2">
        <Label htmlFor="bookingDate" className="flex items-center gap-2">
          <Calendar className="size-4" />
          Date
        </Label>
        <Input
          id="bookingDate"
          type="date"
          value={effectiveBookingDate}
          min={todayIso}
          max={tomorrowIso}
          onChange={(e) => dispatch(setReceptionBookingFormField({ field: "bookingDate", value: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="startsAt" className="flex items-center gap-2">
          <Clock className="size-4" />
          Time slot
        </Label>
        <Select
          value={slotValue}
          onValueChange={(value) => dispatch(setReceptionBookingFormField({ field: "startsAt", value }))}
          disabled={!slots.length}
        >
          <SelectTrigger id="startsAt" className="w-full" disabled={!slots.length}>
            <SelectValue placeholder={slots.length ? "Select slot" : "No slots available"} />
          </SelectTrigger>
          <SelectContent>
            {slots.map((slot) => (
              <SelectItem key={slot.startsAt} value={slot.startsAt}>
                {new Date(slot.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentMode" className="flex items-center gap-2">
          <IndianRupee className="size-4" />
          Payment at shop
        </Label>
        <Select
          value={bookingForm.paymentMode || "OFFLINE_CASH"}
          onValueChange={(value) => dispatch(setReceptionBookingFormField({ field: "paymentMode", value }))}
        >
          <SelectTrigger id="paymentMode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OFFLINE_CASH">Cash</SelectItem>
            <SelectItem value="OFFLINE_UPI">UPI transfer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="stylist" className="flex items-center gap-2">
          <Users className="size-4" />
          Stylist
        </Label>
        <Select
          value={bookingForm.stylistId || undefined}
          onValueChange={(value) => dispatch(setReceptionBookingFormField({ field: "stylistId", value }))}
        >
          <SelectTrigger id="stylist" className="w-full">
            <SelectValue placeholder="Select stylist" />
          </SelectTrigger>
          <SelectContent>
            {(selectedSlot?.stylists?.length ? selectedSlot.stylists : stylists).map((stylist) => (
              <SelectItem key={stylist.id} value={stylist.id}>
                {stylist.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm lg:col-span-2">
        <div className="flex flex-wrap justify-between gap-2">
          <span>Total Rs {Number(priceSummary.totalAmount ?? 0).toFixed(2)}</span>
          <span>Discount Rs {Number(priceSummary.discountAmount ?? 0).toFixed(2)}</span>
          <span className="font-semibold">Payable Rs {Number(priceSummary.payableAmount ?? 0).toFixed(2)}</span>
        </div>
        {priceSummary.offerLabel ? (
          <p className="mt-2 text-xs font-medium text-primary">{priceSummary.offerLabel}</p>
        ) : null}
      </div>
      <div className="lg:col-span-2">
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={
            mutating ||
            customerLookupLoading ||
            customerLookup.status === "CONFLICT_NON_CUSTOMER_ACCOUNT" ||
            !services.length ||
            !bookingForm.serviceIds?.length ||
            !bookingForm.startsAt ||
            !bookingForm.stylistId
          }
          onClick={() => void createBooking()}
        >
          {mutating ? "Creating…" : "Create booking"}
        </Button>
      </div>
    </>
  );

  if (isPageLayout) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="font-serif text-lg font-bold">1. Customer</h2>
          <p className="mb-4 text-sm text-muted-foreground">Look up or enter walk-in customer details.</p>
          <div className="grid gap-4 md:grid-cols-2">{customerSection}</div>
        </section>
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="font-serif text-lg font-bold">2. Services</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Review offers for this customer, then select services with member pricing.
          </p>
          {servicesSection}
        </section>
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="font-serif text-lg font-bold">3. Schedule</h2>
          <p className="mb-4 text-sm text-muted-foreground">Pick date, slot, stylist, and payment method.</p>
          <div className="grid gap-4 md:grid-cols-2">{scheduleSection}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="font-serif text-lg font-bold">New walk-in booking</h2>
        <p className="text-sm text-muted-foreground">Look up customer, pick services, assign slot and stylist.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {customerSection}
        <div className="space-y-3 md:col-span-2">{servicesSection}</div>
        {scheduleSection}
      </div>
    </div>
  );
}
