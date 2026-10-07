"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarCheck2, CalendarPlus, Clock, History, Info, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { AnimatedTabBar, ConfirmSheet, EmptyState, ErrorState, IconButton, PullToRefresh } from "@/components/kit";
import { SkeletonCard } from "@/components/motion/skeleton-shimmer";
import { spring } from "@/components/motion/presets";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { normalizeBookingStatus } from "@/lib/booking-pending-status";
import {
  cancelCustomerBookingAsync,
  clearCustomerCancellationPreview,
  connectCustomerRealtime,
  disconnectCustomerRealtime,
  fetchCustomerBookings,
  fetchCustomerCancellationPreviewAsync,
  fetchCustomerServices,
  removeCustomerBookingFromHistoryAsync,
  setCustomerBookingField,
} from "@/store/customer-bookings-slice";
import { UserLayout } from "../portal/user-layout";
import { fetchCustomerFeedback, sendBookingFeedback } from "../lib/user-api";
import { UPCOMING_STATUSES, rebookServiceIds } from "../lib/bookings";
import { BookingCard } from "../components/bookings/booking-card";
import { CancelBookingSheet } from "../components/bookings/cancel-booking-sheet";
import { ReviewSheet } from "../components/bookings/review-sheet";
import { InvoiceSheet } from "../components/bookings/invoice-sheet";

const POLICY = [
  { condition: "24h+ before", refund: "100% back", tone: "bg-success/12 text-ink-success" },
  { condition: "30 min – 24h", refund: "50% back", tone: "bg-warning/14 text-ink-warning" },
  { condition: "Under 30 min", refund: "No refund", tone: "bg-destructive/12 text-ink-destructive" },
];

export default function UserBookingHistoryPage() {
  const { appUser } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { bookings, services, loading: bookingsLoading, realtimeConnected, deletingBookingId, cancellationPreview, cancellationPreviewLoading, error } = useSelector(
    (state) => state.customerBookings
  );
  const isUser = appUser?.role === "USER";

  const [tab, setTab] = useState("upcoming");
  const [showPolicy, setShowPolicy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null); // { booking, mode: "cancel" | "reschedule" }
  const [removeTarget, setRemoveTarget] = useState(null);
  const [invoiceTarget, setInvoiceTarget] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [feedbackByBooking, setFeedbackByBooking] = useState({});
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewIsComplaint, setReviewIsComplaint] = useState(false);
  const [justReviewed, setJustReviewed] = useState(null);
  const reviewedRefs = useRef({});

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadFeedback = useCallback(async () => {
    try {
      const data = await fetchCustomerFeedback();
      const map = {};
      for (const item of data.feedback ?? []) map[item.bookingId] = item;
      setFeedbackByBooking(map);
    } catch {
      // Non-critical: review badges just won't be pre-populated.
    }
  }, []);

  const reload = useCallback(async () => {
    await Promise.allSettled([dispatch(fetchCustomerBookings()), loadFeedback()]);
    setLoadedOnce(true);
  }, [dispatch, loadFeedback]);

  useEffect(() => {
    if (!isUser) return undefined;
    void reload();
    void dispatch(fetchCustomerServices());
    void dispatch(connectCustomerRealtime());
    return () => {
      void dispatch(disconnectCustomerRealtime());
    };
  }, [isUser, dispatch, reload]);

  useEffect(() => {
    if (error && loadedOnce) notify.error(error);
  }, [error, loadedOnce]);

  function openReview(booking) {
    setReviewTarget(booking);
    setReviewRating(0);
    setReviewComment("");
    setReviewIsComplaint(false);
  }

  async function submitReview() {
    if (!reviewTarget) return;
    try {
      const data = await sendBookingFeedback(reviewTarget.id, { rating: reviewRating, comment: reviewComment, type: reviewIsComplaint ? "COMPLAINT" : "FEEDBACK" });
      const id = reviewTarget.id;
      setFeedbackByBooking((prev) => ({ ...prev, [id]: data.feedback ?? { rating: reviewRating } }));
      setJustReviewed(id);
      notify.success("Thanks for your review");
      setTimeout(() => setReviewTarget(null), 650);
    } catch (err) {
      notify.error("Couldn't send your review", { description: err.message });
      throw err;
    }
  }

  async function openCancel(booking, mode) {
    setCancelTarget({ booking, mode });
    await dispatch(fetchCustomerCancellationPreviewAsync(booking.id));
  }

  function closeCancel() {
    setCancelTarget(null);
    dispatch(clearCustomerCancellationPreview());
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    const { booking, mode } = cancelTarget;
    const result = await dispatch(cancelCustomerBookingAsync(booking.id));
    if (cancelCustomerBookingAsync.rejected.match(result)) {
      notify.error(result.payload ?? "Could not cancel booking");
      throw new Error("cancel failed");
    }
    notify.success("Booking cancelled", { description: result.payload?.refund?.message });
    setTimeout(() => {
      closeCancel();
      if (mode === "reschedule") rebook(booking, "Pick a new time");
    }, 700);
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    const result = await dispatch(removeCustomerBookingFromHistoryAsync(removeTarget.id));
    if (removeCustomerBookingFromHistoryAsync.rejected.match(result)) {
      notify.error(result.payload ?? "Could not remove booking");
      throw new Error("remove failed");
    }
    notify.success("Removed from history");
  }

  function rebook(booking, message = "Added to your booking") {
    const ids = rebookServiceIds(booking, services);
    if (!ids.length) {
      notify.info("Pick your services", { description: "That service isn't on the menu any more." });
      navigate("/user-dashboard/appointments");
      return;
    }
    dispatch(setCustomerBookingField({ field: "serviceIds", value: ids }));
    notify.success(message, { description: booking.service });
    navigate("/user-dashboard/appointments");
  }

  // The rating badge pops once after a review lands.
  useEffect(() => {
    if (!justReviewed || reduce) return;
    const el = reviewedRefs.current[justReviewed];
    el?.animate?.([{ transform: "scale(0.5) rotate(-10deg)" }, { transform: "scale(1.15) rotate(4deg)" }, { transform: "scale(1)" }], { duration: 520, easing: "cubic-bezier(.34,1.56,.64,1)" });
  }, [justReviewed, feedbackByBooking, reduce]);

  const preview = cancellationPreview?.preview;
  const sorted = useMemo(() => [...bookings].sort((x, y) => new Date(y.startsAt) - new Date(x.startsAt)), [bookings]);
  const upcoming = sorted.filter((b) => UPCOMING_STATUSES.has(normalizeBookingStatus(b.status))).reverse();
  const past = sorted.filter((b) => !UPCOMING_STATUSES.has(normalizeBookingStatus(b.status)));
  const visible = tab === "upcoming" ? upcoming : past;
  const firstLoad = !loadedOnce && bookingsLoading && !bookings.length;

  return (
    <UserLayout
      pageTitle="Bookings"
      width="lg"
      actions={
        <>
          <span
            className={cn("hidden h-8 items-center gap-1.5 rounded-full px-3 text-caption font-semibold sm:inline-flex", realtimeConnected ? "bg-success/12 text-ink-success" : "bg-muted text-ink-neutral")}
            title={realtimeConnected ? "Live updates on" : "Live updates paused"}
          >
            {realtimeConnected ? <Wifi className="size-3.5" aria-hidden /> : <WifiOff className="size-3.5" aria-hidden />}
            {realtimeConnected ? "Live" : "Offline"}
          </span>
          <IconButton icon={RefreshCw} label="Refresh" className="hidden sm:inline-grid" onClick={() => void reload()} />
        </>
      }
    >
      <PullToRefresh onRefresh={reload}>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AnimatedTabBar
              label="Bookings"
              value={tab}
              onChange={setTab}
              items={[
                { value: "upcoming", label: "Upcoming", icon: CalendarCheck2, badge: upcoming.length || undefined },
                { value: "past", label: "Past", icon: History },
              ]}
            />
            <button
              type="button"
              onClick={() => setShowPolicy((open) => !open)}
              aria-expanded={showPolicy}
              className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-neutral hover:bg-muted"
            >
              <Info className="size-4 text-portal" aria-hidden /> Refunds
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showPolicy ? (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring.soft}
                className="grid gap-2 sm:grid-cols-3"
              >
                {POLICY.map((rule) => (
                  <div key={rule.condition} className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 ring-1 ring-inset ring-border/60">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="size-4 text-ink-neutral" aria-hidden /> {rule.condition}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-1 text-micro font-bold", rule.tone)}>{rule.refund}</span>
                  </div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {firstLoad ? (
            <div className="space-y-3" aria-label="Loading bookings">
              {Array.from({ length: 3 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error && !bookings.length ? (
            <ErrorState title="Couldn't load bookings" onRetry={reload} offline={typeof navigator !== "undefined" && navigator.onLine === false} />
          ) : !visible.length ? (
            <EmptyState
              illustration="calendar"
              title={tab === "upcoming" ? "Nothing coming up" : "No past visits"}
              action={
                tab === "upcoming" ? (
                  <Link to="/user-dashboard/appointments" className="inline-flex h-11 items-center gap-2 rounded-control bg-portal px-5 text-sm font-semibold text-portal-foreground shadow-soft">
                    <CalendarPlus className="size-4" aria-hidden /> Book now
                  </Link>
                ) : null
              }
            />
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false} mode="popLayout">
                {visible.map((booking, index) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    index={index}
                    nowMs={nowMs}
                    feedback={feedbackByBooking[booking.id]}
                    deleting={deletingBookingId === booking.id}
                    reviewedRef={(el) => (reviewedRefs.current[booking.id] = el)}
                    onInvoice={setInvoiceTarget}
                    onReview={openReview}
                    onCancel={(b) => void openCancel(b, "cancel")}
                    onReschedule={(b) => void openCancel(b, "reschedule")}
                    onRemove={setRemoveTarget}
                    onRebook={(b) => rebook(b)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </PullToRefresh>

      <CancelBookingSheet
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && closeCancel()}
        mode={cancelTarget?.mode}
        loading={cancellationPreviewLoading}
        preview={preview}
        booking={cancellationPreview?.booking ?? cancelTarget?.booking}
        onConfirm={confirmCancel}
      />
      <ConfirmSheet
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        kind="destructive"
        icon={Trash2}
        title="Remove from history?"
        description={removeTarget?.service}
        confirmLabel="Slide to remove"
        cancelLabel="Keep"
        onConfirm={confirmRemove}
      />
      <ReviewSheet
        open={Boolean(reviewTarget)}
        onOpenChange={(open) => !open && setReviewTarget(null)}
        booking={reviewTarget}
        rating={reviewRating}
        onRating={setReviewRating}
        comment={reviewComment}
        onComment={setReviewComment}
        complaint={reviewIsComplaint}
        onComplaint={setReviewIsComplaint}
        onSubmit={submitReview}
      />
      <InvoiceSheet open={Boolean(invoiceTarget)} onOpenChange={(open) => !open && setInvoiceTarget(null)} booking={invoiceTarget} />
    </UserLayout>
  );
}
