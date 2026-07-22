"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import {
    fetchAdminBookings,
    selectAdminAppointments,
    setAppointmentsQuery,
    setAppointmentsStatusFilter,
} from "@/store/admin-portal-slice";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";
import { getBookingDisplayStatus } from "@/lib/booking-pending-status";

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

function toBadgeVariant(status) {
    if (status === "COMPLETED")
        return "default";
    if (status === "STARTED" || status === "Pending")
        return "secondary";
    return "outline";
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
    return (<AdminLayout pageTitle="Appointments" actions={<Button asChild variant="outline" size="sm">
          <Link to="/admin-dashboard">Dashboard</Link>
        </Button>}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5"/>
            Admin Booking Management
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {["ALL", "PENDING", "STARTED", "COMPLETED"].map((status) => (<Button key={status} type="button" size="sm" variant={appointmentsFilter.status === status ? "default" : "outline"} onClick={() => dispatch(setAppointmentsStatusFilter(status))}>
                {status}
              </Button>))}
          </div>
          <p className="text-xs text-muted-foreground">
            Realtime: {realtimeConnected ? "Connected — list updates automatically" : "Disconnected"} | Total: {appointmentsPagination.total}
          </p>
          <p className="text-xs text-muted-foreground">
            Status is read-only here. Only the assigned stylist can mark a booking as STARTED or COMPLETED from their dashboard.
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            <Input placeholder="Search customer/service" value={searchText} onChange={(e) => setSearchText(e.target.value)}/>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}/>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}/>
          </div>
          <div>
            <Button type="button" size="sm" variant="outline" onClick={resetFilters}>Reset filters</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointmentsLoading ? <div className="rounded-md border p-3 text-xs text-muted-foreground">Loading bookings...</div> : null}
          {!appointmentsLoading && appointments.length === 0 ? (<div className="rounded-md border p-3 text-sm text-muted-foreground">No bookings yet.</div>) : null}
          {appointments.map(item => (<div key={item.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{item.customer}</p>
                <p className="text-sm text-muted-foreground">{item.service}</p>
                <p className="text-xs text-muted-foreground">Stylist: {item.stylistName ?? "Not assigned"}</p>
                <p className="text-xs text-muted-foreground">Contact: {item.customerPhone || "—"} | {item.customerEmail || "—"}</p>
                {Array.isArray(item.services) && item.services.length ? (<div className="mt-2 text-xs text-muted-foreground">
                    Services: {item.services.map((service) => `${service.name}(Rs ${service.basePrice})`).join(", ")}
                  </div>) : null}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="inline-flex items-center gap-1 text-sm font-medium">
                    <Clock className="size-4"/>
                    {toDisplayTime(item.startsAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">{toDisplayDuration(item.durationMinutes)}</p>
                  <BookingFinancialSummary booking={item} compact />
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Live status</p>
                  <Badge variant={toBadgeVariant(getBookingDisplayStatus(item))} className="pointer-events-none">{getBookingDisplayStatus(item)}</Badge>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedBooking(item)}>
                  View
                </Button>
              </div>
            </div>))}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Showing {appointmentsPagination.offset + 1}-
              {Math.min(appointmentsPagination.offset + appointments.length, appointmentsPagination.total)} of{" "}
              {appointmentsPagination.total}
            </p>
            <div className="space-x-2">
              <Button type="button" size="sm" variant="outline" onClick={onPrevPage} disabled={appointmentsPagination.offset <= 0}>
                Previous
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onNextPage} disabled={appointmentsPagination.offset + appointmentsPagination.limit >= appointmentsPagination.total}>
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => {
            if (!open)
                setSelectedBooking(null);
        }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
            <DialogDescription>Read-only booking details. Status changes are performed by the assigned stylist only.</DialogDescription>
          </DialogHeader>
          {selectedBooking ? (<div className="space-y-2 text-sm">
              <p><span className="font-medium">Customer:</span> {selectedBooking.customer}</p>
              <p><span className="font-medium">Email:</span> {selectedBooking.customerEmail || "—"}</p>
              <p><span className="font-medium">Phone:</span> {selectedBooking.customerPhone || "—"}</p>
              <p><span className="font-medium">Stylist:</span> {selectedBooking.stylistName ?? "Not assigned"}</p>
              <p><span className="font-medium">Slot:</span> {new Date(selectedBooking.startsAt).toLocaleString()}</p>
              <p><span className="font-medium">Duration:</span> {toDisplayDuration(selectedBooking.durationMinutes)}</p>
              <p><span className="font-medium">Status:</span> {selectedBooking.status}</p>
              <BookingFinancialSummary booking={selectedBooking} />
              {Array.isArray(selectedBooking.services) && selectedBooking.services.length ? (<div className="space-y-1">
                  <p className="font-medium">Services</p>
                  {selectedBooking.services.map((service) => (<p key={service.id ?? service.name}>
                      - {service.name} | Rs {Number(service.basePrice ?? 0).toFixed(2)} | {Number(service.discountPercent ?? 0)}% off
                    </p>))}
                </div>) : <p>No service item breakdown available.</p>}
            </div>) : null}
        </DialogContent>
      </Dialog>
    </AdminLayout>);
}
