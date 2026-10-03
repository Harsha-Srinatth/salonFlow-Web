"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/ui/star-rating";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
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
import { animate } from "animejs";
import {
  Ban,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Flag,
  History,
  Info,
  Loader2,
  MessageSquareHeart,
  ShieldAlert,
  Trash2,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { notify } from "@/lib/notify";
import { UserLayout } from "../portal/user-layout";
import {
  formatCountdownMs,
  getBookingDisplayStatus,
  getPendingAutoCompleteCountdownMs,
  isNoShowBooking,
  isStartedPendingAutoComplete,
  normalizeBookingStatus,
} from "@/lib/booking-pending-status";

async function feedbackAuthFetch(path, init) {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

const CANCELLATION_POLICY_SUMMARY = [
  { condition: "24h+ before", refund: "100% back", tone: "bg-success/15 text-success" },
  { condition: "30 min to 24h", refund: "50% back", tone: "bg-warning/20 text-warning" },
  { condition: "Under 30 min", refund: "No refund", tone: "bg-destructive/15 text-destructive" },
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
  return s === "COMPLETED" || s === "CANCELLED" || s === "NO-SHOW";
}

function canReviewBooking(status) {
  return normalizeStatus(status) === "COMPLETED";
}

const STATUS_STYLE = {
  CONFIRMED: { tone: "bg-primary/10 text-primary", icon: CalendarCheck, label: "Confirmed" },
  PENDING: { tone: "bg-accent/15 text-accent", icon: Clock, label: "Pending" },
  COMPLETED: { tone: "bg-success/15 text-success", icon: CheckCircle2, label: "Done" },
  CANCELLED: { tone: "bg-destructive/10 text-destructive", icon: XCircle, label: "Cancelled" },
  "NO-SHOW": { tone: "bg-warning/20 text-warning", icon: ShieldAlert, label: "Missed" },
};
const UPCOMING_STATUSES = new Set(["PENDING", "CONFIRMED", "STARTED"]);

export default function UserBookingHistoryPage() {
  const { appUser, loading } = useAuth();
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

  const [tab, setTab] = useState("upcoming");
  const [showPolicy, setShowPolicy] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());

  const [feedbackByBooking, setFeedbackByBooking] = useState({});
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewIsComplaint, setReviewIsComplaint] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const reviewedBadgeRefs = useRef({});

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!appUser || appUser.role !== "USER") return;
    void dispatch(fetchCustomerBookings());
    void dispatch(connectCustomerRealtime());
    void loadFeedback();
    return () => {
      void dispatch(disconnectCustomerRealtime());
    };
  }, [appUser, dispatch]);

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);

  async function loadFeedback() {
    try {
      const data = await feedbackAuthFetch("/api/customer/feedback");
      const map = {};
      for (const item of data.feedback ?? []) map[item.bookingId] = item;
      setFeedbackByBooking(map);
    } catch {
      // Non-critical: review badges just won't be pre-populated.
    }
  }

  function closeCancelDialog() {
    setCancelDialogOpen(false);
    setCancelTargetId(null);
    dispatch(clearCustomerCancellationPreview());
  }

  function openReviewDialog(booking) {
    setReviewTarget(booking);
    setReviewRating(0);
    setReviewComment("");
    setReviewIsComplaint(false);
    setReviewDialogOpen(true);
  }

  function closeReviewDialog() {
    setReviewDialogOpen(false);
    setReviewTarget(null);
  }

  async function submitReview() {
    if (!reviewTarget) return;
    if (reviewRating < 1) {
      notify.error("Pick a star rating");
      return;
    }
    setSubmittingReview(true);
    try {
      const data = await feedbackAuthFetch(`/api/customer/bookings/${reviewTarget.id}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          rating: reviewRating,
          comment: reviewComment,
          type: reviewIsComplaint ? "COMPLAINT" : "FEEDBACK",
        }),
      });
      const reviewedBookingId = reviewTarget.id;
      setFeedbackByBooking((prev) => ({ ...prev, [reviewedBookingId]: data.feedback }));
      notify.success("Thanks for your review");
      closeReviewDialog();
      window.requestAnimationFrame(() => {
        const el = reviewedBadgeRefs.current[reviewedBookingId];
        if (!el) return;
        animate(el, {
          scale: [0.5, 1.2, 1],
          rotate: ["-10deg", "6deg", "0deg"],
          duration: 560,
          ease: "outElastic(1, .6)",
        });
      });
    } catch (error) {
      notify.error("Couldn't send your review", { description: error.message });
    } finally {
      setSubmittingReview(false);
    }
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
      notify.error(result.payload ?? "Could not cancel booking");
      return;
    }
    const refundMsg = result.payload?.refund?.message;
    notify.success("Booking cancelled", { description: refundMsg });
    closeCancelDialog();
  }

  async function handleRemoveFromHistory(booking) {
    if (!window.confirm("Remove this booking from your history?")) return;
    const result = await dispatch(removeCustomerBookingFromHistoryAsync(booking.id));
    if (removeCustomerBookingFromHistoryAsync.rejected.match(result)) {
      notify.error(result.payload ?? "Could not remove booking");
      return;
    }
    notify.success("Removed from history");
  }

  const preview = cancellationPreview?.preview;
  const previewBooking = cancellationPreview?.booking;
  const policyRules = cancellationPreview?.policyRules ?? CANCELLATION_POLICY_SUMMARY;
  const isCancelling = Boolean(cancelTargetId && cancellingBookingId === cancelTargetId);

  const sorted = useMemo(
    () => [...bookings].sort((x, y) => new Date(y.startsAt) - new Date(x.startsAt)),
    [bookings]
  );
  const upcoming = sorted.filter((b) => UPCOMING_STATUSES.has(normalizeStatus(b.status))).reverse();
  const past = sorted.filter((b) => !UPCOMING_STATUSES.has(normalizeStatus(b.status)));
  const visible = tab === "upcoming" ? upcoming : past;

  if (loading) {
    return (
      <UserLayout pageTitle="History">
        <Skeleton className="h-96 max-w-4xl rounded-3xl" />
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
      pageTitle="History"
      width="lg"
      actions={
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
            realtimeConnected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          )}
        >
          <span className={cn("size-2 rounded-full", realtimeConnected ? "bg-success" : "bg-muted-foreground")} />
          {realtimeConnected ? "Live" : "Offline"}
        </span>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full bg-card p-1" role="tablist">
            {[
              { key: "upcoming", label: "Upcoming", icon: CalendarClock, count: upcoming.length },
              { key: "past", label: "Past", icon: History, count: past.length },
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold",
                  tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
                <span className="opacity-70">{count}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowPolicy((open) => !open)}
            aria-expanded={showPolicy}
            className="flex h-10 items-center gap-1.5 rounded-full bg-card px-4 text-sm font-medium"
          >
            <Info className="size-4 text-primary" />
            Refunds
            <ChevronDown className={cn("size-4 transition-transform", showPolicy && "rotate-180")} />
          </button>
        </div>

        {showPolicy ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {CANCELLATION_POLICY_SUMMARY.map((rule) => (
              <div key={rule.condition} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="size-4 text-muted-foreground" />
                  {rule.condition}
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", rule.tone)}>{rule.refund}</span>
              </div>
            ))}
          </div>
        ) : null}

        {!visible.length ? (
          <EmptyState
            icon={tab === "upcoming" ? CalendarPlus : History}
            title={tab === "upcoming" ? "Nothing coming up" : "No past visits"}
            action={
              tab === "upcoming" ? (
                <Button asChild className="h-11 rounded-full px-6">
                  <Link to="/user-dashboard/appointments">
                    <CalendarPlus /> Book now
                  </Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((booking) => {
              const status = STATUS_STYLE[normalizeStatus(booking.status)] ?? STATUS_STYLE.PENDING;
              const StatusIcon = status.icon;
              const cancellable = canCancelBooking(booking.status);
              const removable = canRemoveFromHistory(booking.status);
              const reviewable = canReviewBooking(booking.status);
              const existingFeedback = feedbackByBooking[booking.id];
              const pendingAutoComplete = isStartedPendingAutoComplete(booking);
              const displayStatus = pendingAutoComplete ? "In service" : status.label;
              const isDeleting = deletingBookingId === booking.id;
              const when = new Date(booking.startsAt);

              return (
                <li key={booking.id} className="space-y-4 rounded-3xl bg-card p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    <div className="grid w-14 shrink-0 place-items-center rounded-2xl bg-secondary py-2 text-primary">
                      <span className="text-xs font-semibold uppercase">{when.toLocaleDateString([], { month: "short" })}</span>
                      <span className="font-display text-2xl font-bold leading-none">{when.getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold">{booking.service}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-4" />
                          {when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="size-4" />
                          {booking.stylistName ?? "To be assigned"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Wallet className="size-4" />₹{Math.round(Number(booking.payableAmount ?? 0))}
                        </span>
                      </p>
                    </div>
                    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold", status.tone)}>
                      <StatusIcon className="size-3.5" />
                      {displayStatus}
                    </span>
                  </div>

                  {pendingAutoComplete ? (
                    <p className="flex items-center gap-2 rounded-2xl bg-accent/15 px-3 py-2 text-sm font-medium text-accent">
                      <Loader2 className="size-4 animate-spin" />
                      Wraps up in {formatCountdownMs(getPendingAutoCompleteCountdownMs(booking, nowMs))}
                    </p>
                  ) : null}

                  {isNoShowBooking(booking) ? (
                    <p className="flex items-center gap-2 rounded-2xl bg-warning/15 px-3 py-2 text-sm font-medium">
                      <ShieldAlert className="size-4 shrink-0" />
                      Missed visit · no refund
                    </p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="secondary" size="sm" className="rounded-full">
                      <a href={toApiUrl(`/api/customer/bookings/${booking.id}/invoice.pdf`)} target="_blank" rel="noreferrer">
                        <Download /> Invoice
                      </a>
                    </Button>
                    {reviewable ? (
                      existingFeedback ? (
                        <span
                          ref={(el) => (reviewedBadgeRefs.current[booking.id] = el)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent"
                        >
                          <StarRating value={existingFeedback.rating} readOnly size="sm" />
                        </span>
                      ) : (
                        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => openReviewDialog(booking)}>
                          <MessageSquareHeart className="text-accent" /> Review
                        </Button>
                      )
                    ) : null}
                    {cancellable ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full text-destructive"
                        onClick={() => void openCancelDialog(booking)}
                      >
                        <Ban /> Cancel
                      </Button>
                    ) : null}
                    {removable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-muted-foreground"
                        disabled={isDeleting}
                        onClick={() => void handleRemoveFromHistory(booking)}
                      >
                        {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />} Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Cancel dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => !open && closeCancelDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="size-5 text-destructive" />
              Cancel booking
            </DialogTitle>
            <DialogDescription className="sr-only">Check your refund before cancelling</DialogDescription>
          </DialogHeader>

          {cancellationPreviewLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <div className="space-y-3">
              {previewBooking ? (
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="font-semibold">{previewBooking.service}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {new Date(previewBooking.startsAt).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              ) : null}

              {preview?.canCancel ? (
                <div className="rounded-2xl bg-success/10 p-4">
                  <p className="text-sm font-semibold text-success">{preview.tierLabel}</p>
                  <p className="mt-1 font-display text-3xl font-bold">
                    ₹{Math.round(Number(preview.refundAmount ?? 0))}
                    <span className="ml-2 font-sans text-sm font-medium text-muted-foreground">back · {preview.refundPercent}%</span>
                  </p>
                  {Number(preview.retainedAmount ?? 0) > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">₹{Math.round(Number(preview.retainedAmount))} not refundable</p>
                  ) : null}
                </div>
              ) : (
                <p className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-4 text-sm font-medium text-destructive">
                  <ShieldAlert className="size-5 shrink-0" />
                  {preview?.reason ?? "This booking can't be cancelled."}
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" className="rounded-full" onClick={closeCancelDialog}>
              Keep it
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              disabled={cancellationPreviewLoading || !preview?.canCancel || isCancelling}
              onClick={() => void confirmCancelBooking()}
            >
              {isCancelling ? <Loader2 className="animate-spin" /> : <Ban />}
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => !open && closeReviewDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareHeart className="size-5 text-accent" />
              {reviewTarget?.service ?? "Your visit"}
            </DialogTitle>
            <DialogDescription className="sr-only">Rate your visit</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex flex-col items-center gap-2">
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
              <p className="h-4 text-xs text-muted-foreground">
                {["Tap a star", "Sorry to hear that", "We can do better", "Thanks for the feedback", "Glad you liked it", "Wonderful!"][reviewRating]}
              </p>
            </div>

            <textarea
              id="review-comment"
              rows={3}
              maxLength={2000}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Add a comment (optional)"
              aria-label="Comment"
              className="flex w-full rounded-2xl bg-secondary px-4 py-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />

            <button
              type="button"
              role="switch"
              aria-checked={reviewIsComplaint}
              onClick={() => setReviewIsComplaint((value) => !value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl p-3 text-left text-sm font-medium",
                reviewIsComplaint ? "bg-destructive/10 text-destructive" : "bg-secondary"
              )}
            >
              <Flag className="size-4 shrink-0" />
              <span className="flex-1">This is a complaint</span>
              <span className={cn("flex h-6 w-11 shrink-0 items-center rounded-full p-0.5", reviewIsComplaint ? "bg-destructive" : "bg-muted-foreground/30")}>
                <span className={cn("size-5 rounded-full bg-white transition-transform", reviewIsComplaint ? "translate-x-5" : "translate-x-0")} />
              </span>
            </button>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" className="rounded-full" onClick={closeReviewDialog}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" disabled={submittingReview || reviewRating < 1} onClick={() => void submitReview()}>
              {submittingReview ? <Loader2 className="animate-spin" /> : null}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}
