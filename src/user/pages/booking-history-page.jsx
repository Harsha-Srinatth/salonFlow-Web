"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toApiUrl } from "@/lib/api-base";
import {
  cancelCustomerBookingAsync,
  clearCustomerCancellationPreview,
  connectCustomerRealtime,
  disconnectCustomerRealtime,
  fetchCustomerBookings,
  fetchCustomerCancellationPreviewAsync,
  removeCustomerBookingFromHistoryAsync,
} from "@/store/customer-bookings-slice";
import {
  AlertCircle,
  Ban,
  Calendar,
  Download,
  Info,
  Trash2,
  Clock,
  User,
  CheckCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UserLayout } from "../portal/user-layout";
import {
  formatCountdownMs,
  getBookingDisplayStatus,
  getPendingAutoCompleteCountdownMs,
  isStartedPendingAutoComplete,
  normalizeBookingStatus,
} from "@/lib/booking-pending-status";

const CANCELLATION_POLICY_SUMMARY = [
  {
    condition: "24 hours or more before",
    refund: "100% refund",
    detail: "Full amount paid is credited back to you.",
  },
  {
    condition: "30 mins to 24 hours before",
    refund: "50% refund",
    detail: "Half is credited back; the stylist slot is freed immediately.",
  },
  {
    condition: "30 minutes or less before",
    refund: "No refund",
    detail: "No payback; the stylist slot is still freed for others.",
  },
];

function normalizeStatus(status) {
  return normalizeBookingStatus(status);
}

function canCancelBooking(status) {
  const s = normalizeStatus(status);
  return s === "PENDING" || s === "CONFIRMED";
}

function canRemoveFromHistory(status) {
  const s = normalizeStatus(status);
  return s === "COMPLETED" || s === "CANCELLED";
}

function getStatusColor(status) {
  const s = normalizeStatus(status);
  switch (s) {
    case "CONFIRMED":
      return "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-300";
    case "COMPLETED":
      return "bg-green-100 text-green-900 dark:bg-green-900/20 dark:text-green-300";
    case "CANCELLED":
      return "bg-red-100 text-red-900 dark:bg-red-900/20 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-900 dark:bg-gray-900/20 dark:text-gray-300";
  }
}

export default function UserBookingHistoryPage() {
  const { appUser, loading, logout } = useAuth();
  const dispatch = useDispatch();
  const {
    bookings,
    realtimeConnected,
    deletingBookingId,
    cancellingBookingId,
    cancellationPreview,
    cancellationPreviewLoading,
    error,
  } = useSelector((state) => state.customerBookings);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!appUser || appUser.role !== "USER") return;
    void dispatch(fetchCustomerBookings());
    void dispatch(connectCustomerRealtime());
    return () => {
      void dispatch(disconnectCustomerRealtime());
    };
  }, [appUser, dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  function closeCancelDialog() {
    setCancelDialogOpen(false);
    setCancelTargetId(null);
    dispatch(clearCustomerCancellationPreview());
  }

  async function openCancelDialog(booking) {
    setCancelTargetId(booking.id);
    setCancelDialogOpen(true);
    await dispatch(fetchCustomerCancellationPreviewAsync(booking.id));
  }

  async function confirmCancelBooking() {
    if (!cancelTargetId) return;
    const result = await dispatch(cancelCustomerBookingAsync(cancelTargetId));
    if (cancelCustomerBookingAsync.rejected.match(result)) {
      toast.error(result.payload ?? "Could not cancel booking");
      return;
    }
    const refundMsg = result.payload?.refund?.message;
    toast.success(refundMsg ?? "Booking cancelled successfully");
    closeCancelDialog();
  }

  async function handleRemoveFromHistory(booking) {
    if (!window.confirm("Remove this booking from history permanently?")) return;
    const result = await dispatch(removeCustomerBookingFromHistoryAsync(booking.id));
    if (removeCustomerBookingFromHistoryAsync.rejected.match(result)) {
      toast.error(result.payload ?? "Could not remove booking");
      return;
    }
    toast.success("Booking removed from history");
  }

  const preview = cancellationPreview?.preview;
  const previewBooking = cancellationPreview?.booking;
  const policyRules = cancellationPreview?.policyRules ?? CANCELLATION_POLICY_SUMMARY;
  const isCancelling = Boolean(cancelTargetId && cancellingBookingId === cancelTargetId);

  if (loading) {
    return (
      <UserLayout pageTitle="Booking History">
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
        <p>Sign in as a customer to view booking history.</p>
        <Button asChild>
          <Link to="/auth/login">Customer login</Link>
        </Button>
      </div>
    );
  }

  return (
    <UserLayout
      pageTitle="Booking History"
      actions={
        <Button variant="destructive" onClick={() => void logout()}>
          Sign out
        </Button>
      }
    >
      <div className="space-y-6 max-w-4xl">
        {/* Cancellation Policy Card */}
        <Card className="border-amber-200/50 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Cancellation policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {CANCELLATION_POLICY_SUMMARY.map((rule, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-600 mt-2" />
                <div>
                  <p className="font-semibold text-foreground">{rule.condition}</p>
                  <p className="text-amber-600 font-medium">{rule.refund}</p>
                  <p className="text-muted-foreground text-xs mt-1">{rule.detail}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bookings List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My bookings</CardTitle>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                realtimeConnected
                  ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400"
              }`}>
                {realtimeConnected ? "● Live" : "● Offline"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {!bookings.length ? (
              <div className="text-center py-12">
                <Calendar className="mx-auto w-16 h-16 text-muted-foreground/20 mb-3" />
                <p className="text-lg font-semibold text-foreground mb-1">No bookings yet</p>
                <p className="text-sm text-muted-foreground mb-6">
                  Your confirmed bookings will appear here
                </p>
                <Button asChild>
                  <Link to="/user-dashboard/appointments">Book your first appointment</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const cancellable = canCancelBooking(booking.status);
                  const removable = canRemoveFromHistory(booking.status);
                  const pendingAutoComplete = isStartedPendingAutoComplete(booking);
                  const displayStatus = getBookingDisplayStatus(booking);
                  const pendingTimerText = pendingAutoComplete
                    ? formatCountdownMs(getPendingAutoCompleteCountdownMs(booking, nowMs))
                    : null;
                  const isDeleting = deletingBookingId === booking.id;

                  return (
                    <Card key={booking.id} className="bg-muted/30 hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="space-y-4">
                          {/* Header Row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-bold text-lg text-foreground">{booking.service}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(booking.startsAt).toLocaleDateString([], {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                                <Clock className="w-4 h-4 ml-2" />
                                {new Date(booking.startsAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${getStatusColor(
                                booking.status
                              )}`}
                            >
                              {displayStatus}
                            </span>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-4 text-sm py-3 border-t border-b border-border/50">
                            <div>
                              <p className="text-muted-foreground">Stylist</p>
                              <p className="font-semibold text-foreground flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {booking.stylistName ?? "To be assigned"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Amount paid</p>
                              <p className="font-semibold text-foreground">
                                ₹{Number(booking.payableAmount ?? 0).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          {/* Auto-complete Timer */}
                          {pendingAutoComplete && (
                            <div className="rounded-lg bg-amber-100/50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-400 font-medium">
                              Service in progress • Auto-completes in {pendingTimerText}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <a
                              href={toApiUrl(
                                `/api/customer/bookings/${booking.id}/invoice.pdf`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium underline"
                            >
                              <Download className="w-4 h-4" />
                              Invoice
                            </a>
                            {cancellable && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => void openCancelDialog(booking)}
                              >
                                <Ban className="mr-1.5 w-4 h-4" />
                                Cancel
                              </Button>
                            )}
                            {removable && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={isDeleting}
                                onClick={() => void handleRemoveFromHistory(booking)}
                              >
                                <Trash2 className="mr-1.5 w-4 h-4" />
                                {isDeleting ? "Removing..." : "Remove"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => !open && closeCancelDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cancel booking</DialogTitle>
            <DialogDescription>
              Review your refund before confirming cancellation
            </DialogDescription>
          </DialogHeader>

          {cancellationPreviewLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading details...</p>
          ) : (
            <div className="space-y-4">
              {previewBooking && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <p className="font-bold text-lg">{previewBooking.service}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(previewBooking.startsAt).toLocaleString()}
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-2">
                      Amount paid: ₹{Number(previewBooking.payableAmount ?? 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {preview?.canCancel ? (
                <Card className="border-success/30 bg-success/5">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <p className="font-bold text-success text-lg">{preview.tierLabel}</p>
                      <p className="text-sm text-muted-foreground">
                        Time until appointment: about {preview.minutesUntilStart} minutes
                      </p>
                      <div className="space-y-1 pt-2 border-t border-success/20">
                        <p className="text-sm font-semibold text-foreground">
                          You will get: ₹{Number(preview.refundAmount ?? 0).toFixed(2)} ({preview.refundPercent}%)
                        </p>
                        {Number(preview.retainedAmount ?? 0) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Non-refundable: ₹{Number(preview.retainedAmount ?? 0).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive font-medium">
                    {preview?.reason ?? "This booking cannot be cancelled."}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeCancelDialog}>
              Keep booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancellationPreviewLoading || !preview?.canCancel || isCancelling}
              onClick={() => void confirmCancelBooking()}
            >
              {isCancelling ? "Cancelling..." : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}
