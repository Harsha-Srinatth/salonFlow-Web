"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CancelBookingDialog } from "@/components/shared/cancel-booking-dialog";
import { Input } from "@/components/ui/input";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { SkeletonRows } from "@/admin/components/skeleton";
import { StatusPill } from "@/admin/components/status-pill";
import { useRevealOnReady } from "@/admin/lib/motion";
import { Calendar, ChevronLeft, ChevronRight, Clock, Mail, Phone, RotateCw, Scissors, User } from "lucide-react";
import {
    fetchAdminBookings,
    fetchAdminCancellationPreviewAsync,
    selectAdminAppointments,
    setAppointmentsQuery,
    setAppointmentsStatusFilter,
    updateAdminBookingStatus,
} from "@/store/admin-portal-slice";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";
import { getBookingDisplayStatus } from "@/lib/booking-pending-status";

const STATUS_TABS = ["ALL", "PENDING", "STARTED", "COMPLETED", "CANCELLED", "NO-SHOW"];

function toDisplayTime(startsAt) {
    const date = new Date(startsAt);
    if (Number.isNaN(date.getTime()))
        return "--:--";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toDisplayDuration(durationMinutes) {
    const value = Number(durationMinutes ?? 0);
    if (!Number.isFinite(value) || value <= 0)
        return "—";
    return `${value}m`;
}

function BookingFinancialSummary({ booking, compact = false }) {
    const isCancelled = booking.status === "CANCELLED";
    const finances = booking.cancellationFinancials;
    if (isCancelled && finances) {
        const collected = Number(finances.collectedAmount ?? booking.payableAmount ?? 0);
        const refund = Number(finances.refundAmount ?? 0);
        const retained = Number(finances.retainedAmount ?? collected - refund);
        return (<div className={compact ? "space-y-0.5" : "space-y-1 rounded-md border border-dashed border-amber-300/60 bg-amber-50/50 p-2 dark:border-amber-900/50 dark:bg-amber-950/20"}>
            <p className="text-xs text-muted-foreground">Paid by customer: Rs {collected.toFixed(2)}</p>
            <p className="text-xs text-destructive">Refund (debt to customer): Rs {refund.toFixed(2)}</p>
            <p className={`text-xs font-semibold text-emerald-700 dark:text-emerald-400 ${compact ? "" : "pt-1"}`}>
              Salon income (kept): Rs {retained.toFixed(2)}
            </p>
          </div>);
    }
    return (<>
        <p className="text-xs text-muted-foreground">Total: Rs {Number(booking.totalAmount ?? 0).toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">Discount: Rs {Number(booking.discountAmount ?? 0).toFixed(2)}</p>
        <p className="text-xs font-medium">Payable: Rs {Number(booking.payableAmount ?? 0).toFixed(2)}</p>
      </>);
}

export default function AdminAppointmentsPage() {
    const dispatch = useDispatch();
    const appointments = useSelector(selectAdminAppointments);
    const { appointmentsFilter, appointmentsLoading, appointmentsError, appointmentsPagination, realtimeConnected } = useSelector((state) => state.adminPortal);
    const [searchText, setSearchText] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [markingNoShow, setMarkingNoShow] = useState(false);
    const [cancelTargetId, setCancelTargetId] = useState(null);
    // Same dialog and same backend refund code as the reception desk.
    const loadCancelPreview = useCallback(async (bookingId) => {
        const result = await dispatch(fetchAdminCancellationPreviewAsync(bookingId));
        return fetchAdminCancellationPreviewAsync.rejected.match(result)
            ? { ok: false, error: result.payload }
            : { ok: true, data: result.payload };
    }, [dispatch]);
    const submitCancel = useCallback(async (bookingId, refundPercent) => {
        const result = await dispatch(updateAdminBookingStatus({ bookingId, status: "CANCELLED", refundPercent }));
        return updateAdminBookingStatus.rejected.match(result) ? { ok: false, error: result.payload } : { ok: true };
    }, [dispatch]);
    const listRef = useRevealOnReady([appointmentsLoading, appointments.length], { selector: ":scope > *" });

    async function markNoShow(booking) {
        if (!booking) return;
        setMarkingNoShow(true);
        try {
            const result = await dispatch(updateAdminBookingStatus({ bookingId: booking.id, status: "NO-SHOW" }));
            if (updateAdminBookingStatus.rejected.match(result)) {
                toast.error(result.payload ?? "Could not mark this booking as a no-show");
                return;
            }
            toast.success("Booking marked as a missed appointment (no-show)");
            setSelectedBooking(null);
            refetchCurrent();
        } finally {
            setMarkingNoShow(false);
        }
    }
    useEffect(() => {
        dispatch(setAppointmentsQuery({
            search: searchText,
            from: fromDate,
            to: toDate,
        }));
    }, [dispatch, fromDate, searchText, toDate]);
    useEffect(() => {
        const status = appointmentsFilter.status === "ALL" ? undefined : appointmentsFilter.status;
        void dispatch(fetchAdminBookings({
            status,
            search: searchText || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
            limit: appointmentsPagination.limit,
            offset: appointmentsPagination.offset,
        }));
    }, [appointmentsFilter.status, appointmentsPagination.limit, appointmentsPagination.offset, dispatch, fromDate, searchText, toDate]);
    useEffect(() => {
        if (appointmentsError)
            toast.error(appointmentsError);
    }, [appointmentsError]);
    function refetchCurrent() {
        void dispatch(fetchAdminBookings({
            status: appointmentsFilter.status === "ALL" ? undefined : appointmentsFilter.status,
            search: searchText || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
            limit: appointmentsPagination.limit,
            offset: appointmentsPagination.offset,
        }));
    }
    function onPrevPage() {
        if (appointmentsPagination.offset <= 0)
            return;
        void dispatch(fetchAdminBookings({
            status: appointmentsFilter.status === "ALL" ? undefined : appointmentsFilter.status,
            search: searchText || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
            limit: appointmentsPagination.limit,
            offset: Math.max(appointmentsPagination.offset - appointmentsPagination.limit, 0),
        }));
    }
    function resetFilters() {
        setSearchText("");
        setFromDate("");
        setToDate("");
        dispatch(setAppointmentsStatusFilter("ALL"));
        void dispatch(fetchAdminBookings({
            limit: appointmentsPagination.limit,
            offset: 0,
        }));
    }
    function onNextPage() {
        const nextOffset = appointmentsPagination.offset + appointmentsPagination.limit;
        if (nextOffset >= appointmentsPagination.total)
            return;
        void dispatch(fetchAdminBookings({
            status: appointmentsFilter.status === "ALL" ? undefined : appointmentsFilter.status,
            search: searchText || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
            limit: appointmentsPagination.limit,
            offset: nextOffset,
        }));
    }
    return (<AdminLayout
        pageTitle="Appointments"
        description="Every booking across your salons, live."
        actions={
          <span className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:inline-flex">
            <span className={`admin-live-dot relative inline-flex size-1.5 rounded-full ${realtimeConnected ? "bg-emerald-500 text-emerald-500" : "bg-muted-foreground text-muted-foreground"}`} />
            {realtimeConnected ? "Live" : "Offline"}
          </span>
        }>
      <div className="space-y-4">
        <ErrorBanner message={appointmentsError} onRetry={refetchCurrent} />

        <Card className="admin-shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="size-5"/>
                Admin Booking Management
              </CardTitle>
              <p className="text-xs text-muted-foreground sm:hidden">
                {realtimeConnected ? "🟢 Live updates" : "⚪ Offline"} · {appointmentsPagination.total} total
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_TABS.map((status) => (<Button key={status} type="button" size="sm" variant={appointmentsFilter.status === status ? "default" : "outline"} onClick={() => dispatch(setAppointmentsStatusFilter(status))}>
                  {status}
                </Button>))}
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Realtime: {realtimeConnected ? "Connected — list updates automatically" : "Disconnected"} | Total: {appointmentsPagination.total}
            </p>
            <p className="text-xs text-muted-foreground">
              Only the assigned stylist can mark a booking as STARTED or COMPLETED from their dashboard. Missed
              appointments are auto-marked as no-show once their slot passes, or open a booking to mark one manually.
            </p>
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Search customer/service" value={searchText} onChange={(e) => setSearchText(e.target.value)}/>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}/>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}/>
            </div>
            <div>
              <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
                <RotateCw className="size-3.5" />
                Reset filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointmentsLoading ? <SkeletonRows count={4} /> : null}
            {!appointmentsLoading && appointments.length === 0 ? (
              <EmptyState icon={Calendar} title="No bookings yet" description="Bookings will appear here as customers schedule appointments." />
            ) : null}
            <div ref={listRef} className="space-y-2.5">
              {appointments.map(item => (
                <div key={item.id} className="admin-card-hover admin-shadow-sm flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <AvatarBadge name={item.customer} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.customer}</p>
                      <p className="truncate text-sm text-muted-foreground">{item.service}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="size-3" /> {item.stylistName ?? "Not assigned"}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {item.customerPhone ? <span className="inline-flex items-center gap-1"><Phone className="size-3" />{item.customerPhone}</span> : null}
                        {item.customerEmail ? <span className="inline-flex items-center gap-1"><Mail className="size-3" />{item.customerEmail}</span> : null}
                      </p>
                      {Array.isArray(item.services) && item.services.length ? (<p className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
                          <Scissors className="mt-0.5 size-3 shrink-0" />
                          <span>{item.services.map((service) => `${service.name}(Rs ${service.basePrice})`).join(", ")}</span>
                        </p>) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="inline-flex items-center gap-1 text-sm font-medium">
                        <Clock className="size-4"/>
                        {toDisplayTime(item.startsAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">{toDisplayDuration(item.durationMinutes)}</p>
                      <div className="mt-1">
                        <BookingFinancialSummary booking={item} compact />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusPill status={getBookingDisplayStatus(item)} />
                      <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedBooking(item)}>
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {appointmentsPagination.offset + 1}-
                {Math.min(appointmentsPagination.offset + appointments.length, appointmentsPagination.total)} of{" "}
                {appointmentsPagination.total}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={onPrevPage} disabled={appointmentsPagination.offset <= 0}>
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button type="button" size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={onNextPage} disabled={appointmentsPagination.offset + appointmentsPagination.limit >= appointmentsPagination.total}>
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => {
            if (!open)
                setSelectedBooking(null);
        }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
            <DialogDescription>
              Service start/completion is performed by the assigned stylist only. No-show can be marked here.
            </DialogDescription>
          </DialogHeader>
          {selectedBooking ? (<div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AvatarBadge name={selectedBooking.customer} />
                  <div>
                    <p className="font-semibold">{selectedBooking.customer}</p>
                    <p className="text-xs text-muted-foreground">{selectedBooking.customerEmail || "—"}</p>
                  </div>
                </div>
                <StatusPill status={getBookingDisplayStatus(selectedBooking)} />
              </div>
              <div className="grid gap-1.5 rounded-lg border p-3 sm:grid-cols-2">
                <p><span className="font-medium">Phone:</span> {selectedBooking.customerPhone || "—"}</p>
                <p><span className="font-medium">Stylist:</span> {selectedBooking.stylistName ?? "Not assigned"}</p>
                <p><span className="font-medium">Slot:</span> {new Date(selectedBooking.startsAt).toLocaleString()}</p>
                <p><span className="font-medium">Duration:</span> {toDisplayDuration(selectedBooking.durationMinutes)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <BookingFinancialSummary booking={selectedBooking} />
              </div>
              {Array.isArray(selectedBooking.services) && selectedBooking.services.length ? (<div className="space-y-1">
                  <p className="font-medium">Services</p>
                  {selectedBooking.services.map((service) => (<p key={service.id ?? service.name}>
                      - {service.name} | Rs {Number(service.basePrice ?? 0).toFixed(2)} | {Number(service.discountPercent ?? 0)}% off
                    </p>))}
                </div>) : <p>No service item breakdown available.</p>}
              {(selectedBooking.status === "PENDING" || selectedBooking.status === "CONFIRMED") && (
                <div className="rounded-lg border border-dashed border-amber-300/60 bg-amber-50/50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                  <p className="text-xs text-muted-foreground">
                    Slot passed and the client never checked in? Mark it so the record is closed out — no refund is
                    issued, this only updates the booking status.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 border-amber-400/60 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    disabled={markingNoShow}
                    onClick={() => void markNoShow(selectedBooking)}
                  >
                    {markingNoShow ? "Marking..." : "Mark client did not visit"}
                  </Button>
                  <div className="mt-3 border-t border-amber-300/40 pt-3">
                    <p className="text-xs text-muted-foreground">
                      Cancel this booking and choose how much of the amount paid goes back to the customer.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        const id = selectedBooking.id;
                        setSelectedBooking(null);
                        setCancelTargetId(id);
                      }}
                    >
                      Cancel booking &amp; refund
                    </Button>
                  </div>
                </div>
              )}
            </div>) : null}
        </DialogContent>
      </Dialog>
      <CancelBookingDialog
        bookingId={cancelTargetId}
        open={Boolean(cancelTargetId)}
        onOpenChange={(open) => !open && setCancelTargetId(null)}
        loadPreview={loadCancelPreview}
        submitCancel={submitCancel}
        onCancelled={refetchCurrent}
      />
    </AdminLayout>);
}
