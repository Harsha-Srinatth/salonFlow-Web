"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  setCustomerRecommendedStylists,
} from "@/store/customer-bookings-slice";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Gift,
  Sparkles,
  Ticket,
  User,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UserLayout } from "../portal/user-layout";
import { LoadingOrb } from "@/components/shared/loading-orb";
import { InlineOrb } from "@/components/shared/loading-orb"

async function fetchLoyaltySnapshot() {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl("/api/customer/loyalty"), {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { walletBalance: 0, isFirstTimeCustomer: false, firstBookingDiscountPercent: 0 };
  return {
    walletBalance: Number(data.walletBalance ?? 0),
    isFirstTimeCustomer: Boolean(data.isFirstTimeCustomer),
    firstBookingDiscountPercent: Number(data.firstBookingDiscountPercent ?? 0),
  };
}

async function fetchUnclaimedVouchers() {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl("/api/customer/loyalty/vault"), {
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return new Map();
  const map = new Map();
  for (const win of data.wins ?? []) {
    if (win.status === "UNCLAIMED" && !map.has(win.serviceId)) map.set(win.serviceId, win.serviceName);
  }
  return map;
}

export default function UserAppointmentsPage() {
  const { appUser, loading, logout } = useAuth();
  const dispatch = useDispatch();
  const { stylists, services, slots, recommendedStylists, bookingForm, priceSummary, offers, mutating, error } =
    useSelector((state) => state.customerBookings);
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
  const payingRef = useRef(false); // synchronous guard: state updates are too late for double clicks
  const pollingRef = useRef(false);

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
    if (!appUser || appUser.role !== "USER") return;
    if (!bookingForm.bookingDate) {
      dispatch(setCustomerBookingField({ field: "bookingDate", value: todayIso }));
    }
    void dispatch(fetchCustomerStylists());
    void dispatch(fetchCustomerServices());
    void dispatch(fetchCustomerOffers());
    void fetchLoyaltySnapshot().then((snapshot) => {
      setWalletBalance(snapshot.walletBalance);
      setIsFirstTimeCustomer(snapshot.isFirstTimeCustomer);
      setFirstBookingDiscountPercent(snapshot.firstBookingDiscountPercent);
    });
    void fetchUnclaimedVouchers().then(setUnclaimedVouchers);
  }, [appUser, bookingForm.bookingDate, dispatch, todayIso]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!bookingForm.serviceIds.length || !effectiveBookingDate || !bookingForm.startsAt) {
      dispatch(setCustomerRecommendedStylists([]));
      return;
    }
    void dispatch(
      fetchRecommendedStylists({
        serviceIds: bookingForm.serviceIds,
        startsAt: bookingForm.startsAt,
      })
    );
  }, [effectiveBookingDate, bookingForm.startsAt, bookingForm.serviceIds, dispatch]);

  useEffect(() => {
    if (!bookingForm.serviceIds.length || !effectiveBookingDate) return;
    void dispatch(fetchCustomerSlots({ serviceIds: bookingForm.serviceIds, date: effectiveBookingDate }));
  }, [effectiveBookingDate, bookingForm.serviceIds, dispatch]);

  useEffect(() => {
    if (!selectedSlot?.stylists?.length) return;
    if (!selectedSlot.stylists.some((item) => item.id === bookingForm.stylistId)) {
      dispatch(setCustomerBookingField({ field: "stylistId", value: selectedSlot.stylists[0].id }));
    }
  }, [bookingForm.stylistId, dispatch, selectedSlot]);

  function toggleService(serviceId, checked) {
    const current = bookingForm.serviceIds ?? [];
    const next = checked
      ? Array.from(new Set([...current, serviceId]))
      : current.filter((id) => id !== serviceId);
    dispatch(setCustomerBookingField({ field: "serviceIds", value: next }));
  }

  const firstBookingDiscountAmount = isFirstTimeCustomer
    ? Math.round(priceSummary.payableAmount * (firstBookingDiscountPercent / 100) * 100) / 100
    : 0;
  const afterFirstBookingDiscount = Math.max(0, priceSummary.payableAmount - firstBookingDiscountAmount);

  // Not offered alongside a combo — see the matching guard in createCustomerBooking
  // on the backend (combo pricing has no per-service bundle share to redeem against).
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
    dispatch(resetCustomerBookingForm());
    setUseWalletCredit(false);
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
      toast.success("Payment received — booking confirmed");
      refreshAfterBooking();
    } else if (isTerminalState(status.state)) {
      clearPendingPayment();
      if (status.state === "FAILED") toast.error(status.message ?? "Payment failed");
      else toast.message(status.message ?? "Payment not completed");
    }
  }

  async function watchPayment(orderId) {
    if (pollingRef.current) return;
    pollingRef.current = true;
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
    }
  }

  async function createBooking() {
    if (payingRef.current) return;
    payingRef.current = true;
    setPayStatus(null);
    const payload = {
      serviceIds: bookingForm.serviceIds,
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
          toast.error(booked.payload?.message ?? "Could not create booking");
          return;
        }
        toast.success("Booking Confirmed");
        refreshAfterBooking();
        return;
      }
      applyPaymentResult(result.status);
      if (result.status && !isTerminalState(result.status.state) && result.status.orderId) {
        void watchPayment(result.status.orderId);
      }
    } catch (error) {
      toast.error(error?.message ?? "Could not start the payment");
    } finally {
      payingRef.current = false;
      setPayPhase("idle");
    }
  }

  // Page refresh / returning from a UPI app: resume a payment that had not finished instead of
  // leaving the customer guessing (and instead of letting them pay a second time).
  useEffect(() => {
    if (!appUser || appUser.role !== "USER") return;
    const pending = readPendingPayment();
    if (pending?.orderId) void watchPayment(pending.orderId);
    return () => {
      pollingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser]);

  if (loading) {
    return (
      <UserLayout pageTitle="Book Appointment">
        <LoadingOrb label="Loading…" className="h-96" />
      </UserLayout>
    );
  }

  if (!appUser || appUser.role !== "USER") {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <p>Sign in as a customer to book appointments.</p>
        <Button asChild>
          <Link to="/auth/login">Customer login</Link>
        </Button>
      </div>
    );
  }

  const allFieldsFilled = bookingForm.serviceIds.length && bookingForm.startsAt && bookingForm.stylistId;

  return (
    <UserLayout
      pageTitle="Book Appointment"
      actions={
        <Button variant="destructive" onClick={() => void logout()}>
          Sign out
        </Button>
      }
    >
      <div className="space-y-6 max-w-4xl">
        {/* Offer Alert */}
        {bookingForm.comboId ? (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-start gap-3 pt-4">
              <Gift className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-success">Combo offer applied</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {priceSummary.offerLabel ?? "Your combo discount is included in the final amount."}
                  <Link to="/user-dashboard/offers" className="ml-1 text-success underline font-medium">
                    View more offers
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        ) : offers?.globalDiscount || offers?.serviceOffers?.length ? (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="flex items-start gap-3 pt-4">
              <Gift className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                {offers.globalDiscount ? (
                  <p className="font-semibold text-success">{offers.globalDiscount.label}</p>
                ) : null}
                {offers.serviceOffers?.length ? (
                  <p className="text-muted-foreground">
                    {offers.serviceOffers.length} service-specific offer
                    {offers.serviceOffers.length === 1 ? "" : "s"} — best price shown per service below.
                  </p>
                ) : null}
                <Link to="/user-dashboard/offers" className="text-success underline font-medium">
                  View all offers & combos
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200/50 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10">
            <CardContent className="flex items-start gap-3 pt-4">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                Browse available discounts on{" "}
                <Link to="/user-dashboard/offers" className="font-semibold text-primary underline">
                  Offers
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Booking Card */}
        <Card className="border-border shadow-lg">
          <CardHeader className="pb-6 border-b border-border/50">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="w-6 h-6 text-accent" />
                Create your appointment
              </CardTitle>
              <p className="text-sm text-muted-foreground font-medium">
                Select services, date, time, and your preferred stylist
              </p>
            </div>
          </CardHeader>

          <CardContent className="pt-8 space-y-8">
            {/* Step 1: Services */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </div>
                <Label className="text-base font-bold">Select services</Label>
              </div>
              <ServiceCatalogSelector
                services={services}
                mode="multi"
                label=""
                selectedServiceIds={bookingForm.serviceIds}
                onToggleServiceId={toggleService}
                pricedServices={offers?.pricedServices}
              />
            </div>

            {/* Step 2: Date, Time, Stylist */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </div>
                <Label className="text-base font-bold">Choose date & time</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={effectiveBookingDate}
                    min={todayIso}
                    max={tomorrowIso}
                    onChange={(e) =>
                      dispatch(setCustomerBookingField({ field: "bookingDate", value: e.target.value }))
                    }
                    className="rounded-lg h-11"
                  />
                  <p className="text-xs text-muted-foreground">Today or tomorrow</p>
                </div>

                {/* Time Slot */}
                <div className="space-y-2">
                  <Label htmlFor="slot" className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    Time
                  </Label>
                  <Select
                    value={slots.some((slot) => slot.startsAt === bookingForm.startsAt) ? bookingForm.startsAt : undefined}
                    onValueChange={(value) =>
                      dispatch(setCustomerBookingField({ field: "startsAt", value }))
                    }
                    disabled={!slots.length}
                  >
                    <SelectTrigger id="slot" className="rounded-lg h-11" disabled={!slots.length}>
                      <SelectValue
                        placeholder={slots.length ? "Select time" : "No slots available"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {slots.map((slot) => (
                        <SelectItem key={slot.startsAt} value={slot.startsAt}>
                          {new Date(slot.startsAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!slots.length && bookingForm.serviceIds.length && (
                    <p className="text-xs text-destructive font-medium">No available slots</p>
                  )}
                </div>

                {/* Stylist */}
                <div className="space-y-2">
                  <Label htmlFor="stylist" className="flex items-center gap-2 text-sm font-medium">
                    <User className="w-4 h-4" />
                    Stylist
                  </Label>
                  <Select
                    value={bookingForm.stylistId}
                    onValueChange={(value) =>
                      dispatch(setCustomerBookingField({ field: "stylistId", value }))
                    }
                  >
                    <SelectTrigger id="stylist" className="rounded-lg h-11">
                      <SelectValue placeholder="Select stylist" />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedSlot?.stylists?.length
                        ? selectedSlot.stylists
                        : recommendedStylists.length
                          ? recommendedStylists
                          : stylists
                      ).map((stylist) => (
                        <SelectItem key={stylist.id} value={stylist.id}>
                          {stylist.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {recommendedStylists.length > 0 && (
                    <p className="text-xs text-muted-foreground">Recommended availability</p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Payment Summary */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </div>
                <Label className="text-base font-bold">Payment summary</Label>
              </div>

              {isFirstTimeCustomer && firstBookingDiscountPercent > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-3.5">
                  <Sparkles className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    <span className="font-semibold text-success">Welcome to Sahasra!</span> You get{" "}
                    <span className="font-semibold">{firstBookingDiscountPercent}% off</span> your first booking,
                    applied automatically below.
                  </p>
                </div>
              )}

              <Card className="bg-muted/40 border-border">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total amount</span>
                    <span className="font-semibold">₹{priceSummary.totalAmount.toFixed(2)}</span>
                  </div>

                  {priceSummary.discountAmount > 0 && (
                    <>
                      <div className="flex justify-between items-center text-sm text-success">
                        <span>Discount</span>
                        <span className="font-semibold">-₹{priceSummary.discountAmount.toFixed(2)}</span>
                      </div>
                      {priceSummary.offerLabel && (
                        <p className="text-xs text-muted-foreground">{priceSummary.offerLabel}</p>
                      )}
                    </>
                  )}

                  {firstBookingDiscountAmount > 0 && (
                    <div className="flex justify-between items-center text-sm text-success">
                      <span>First booking discount ({firstBookingDiscountPercent}%)</span>
                      <span className="font-semibold">-₹{firstBookingDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {voucherServiceId && (
                    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5">
                      <span className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={useVoucher}
                          onChange={(e) => setUseVoucher(e.target.checked)}
                          className="mt-0.5 size-4 accent-accent"
                        />
                        <span className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <Ticket className="w-3.5 h-3.5 text-accent" />
                            Redeem free-service voucher
                          </span>
                          <span className="text-xs text-muted-foreground">{voucherServiceName} — won from Refer &amp; Earn</span>
                        </span>
                      </span>
                      {useVoucher && voucherDiscountAmount > 0 && (
                        <span className="shrink-0 text-sm font-semibold text-accent">-₹{voucherDiscountAmount.toFixed(2)}</span>
                      )}
                    </label>
                  )}

                  {walletBalance > 0 && afterVoucherDiscount > 0 && (
                    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5">
                      <span className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={useWalletCredit}
                          onChange={(e) => setUseWalletCredit(e.target.checked)}
                          className="mt-0.5 size-4 accent-accent"
                        />
                        <span className="flex flex-col">
                          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <Wallet className="w-3.5 h-3.5 text-accent" />
                            Use wallet credit
                          </span>
                          <span className="text-xs text-muted-foreground">Available: ₹{walletBalance}</span>
                        </span>
                      </span>
                      {useWalletCredit && walletRedeemAmount > 0 && (
                        <span className="shrink-0 text-sm font-semibold text-accent">-₹{walletRedeemAmount.toFixed(2)}</span>
                      )}
                    </label>
                  )}

                  <div className="border-t border-border pt-3 flex justify-between items-center">
                    <span className="font-bold text-foreground">You pay</span>
                    <span className="text-xl font-bold text-primary">
                      ₹{finalPayableAmount.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {payStatus && payStatus.state !== "CONFIRMED" && payStatus.state !== "AWAITING_PAYMENT" && (
              <div
                role="status"
                className={`flex items-start gap-3 rounded-lg border p-3.5 ${
                  ["FAILED", "EXPIRED", "REFUNDING", "REFUNDED"].includes(payStatus.state)
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-muted/40"
                }`}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-semibold">
                    {payStatus.state === "PENDING" || payStatus.state === "PROCESSING"
                      ? "Payment processing — booking not confirmed yet"
                      : payStatus.state === "CANCELLED"
                        ? "Payment cancelled"
                        : payStatus.state === "FAILED"
                          ? "Payment failed"
                          : payStatus.state === "EXPIRED"
                            ? "Payment session expired"
                            : "Payment received, booking not made"}
                  </p>
                  <p className="text-muted-foreground mt-1">{payStatus.message}</p>
                  {(payStatus.state === "PENDING" || payStatus.state === "PROCESSING") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => payStatus.orderId && void watchPayment(payStatus.orderId)}
                    >
                      Check status
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              className="w-full h-12 rounded-lg text-base font-semibold mt-4"
              disabled={
                mutating ||
                payPhase !== "idle" ||
                payStatus?.state === "PENDING" ||
                payStatus?.state === "PROCESSING" ||
                !allFieldsFilled
              }
              onClick={() => void createBooking()}
            >
              {mutating || payPhase !== "idle" ? (
                <>
                  <InlineOrb theme="light" className="mr-2" />
                  {payPhase === "verifying"
                    ? "Verifying payment..."
                    : payPhase === "checkout"
                      ? "Complete payment in the window..."
                      : "Preparing payment..."}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 w-5 h-5" />
                  {finalPayableAmount > 0 ? `Pay ₹${finalPayableAmount.toFixed(2)} & book` : "Confirm booking"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
