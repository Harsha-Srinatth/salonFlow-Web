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
import {
  createCustomerBookingAsync,
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
  DollarSign,
  Gift,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UserLayout } from "../portal/user-layout";

export default function UserAppointmentsPage() {
  const { appUser, loading, logout } = useAuth();
  const dispatch = useDispatch();
  const { stylists, services, slots, recommendedStylists, bookingForm, priceSummary, offers, mutating, error } =
    useSelector((state) => state.customerBookings);

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

  async function createBooking() {
    const payload = {
      serviceIds: bookingForm.serviceIds,
      bookingDate: effectiveBookingDate,
      startsAt: bookingForm.startsAt,
      stylistId: bookingForm.stylistId,
      comboId: bookingForm.comboId || undefined,
    };
    const closeNow = window.confirm("Payment methods coming soon.\nPress OK to continue booking confirmation.");
    if (!closeNow) return;
    const result = await dispatch(createCustomerBookingAsync(payload));
    if (createCustomerBookingAsync.rejected.match(result)) {
      toast.error(result.payload?.message ?? "Could not create booking");
      return;
    }
    toast.success("Booking Confirmed");
    dispatch(resetCustomerBookingForm());
  }

  if (loading) {
    return (
      <UserLayout pageTitle="Book Appointment">
        <div className="flex items-center justify-center h-96">
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
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

                  <div className="border-t border-border pt-3 flex justify-between items-center">
                    <span className="font-bold text-foreground">You pay</span>
                    <span className="text-xl font-bold text-primary">
                      ₹{priceSummary.payableAmount.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-12 rounded-lg text-base font-semibold mt-4"
              disabled={mutating || !allFieldsFilled}
              onClick={() => void createBooking()}
            >
              {mutating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 w-5 h-5" />
                  Confirm booking
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
