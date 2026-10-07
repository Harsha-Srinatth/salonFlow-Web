"use client";
import { CalendarX2, ChevronLeft, ChevronRight, CircleX, Clock, Mail, Phone, RotateCcw, Scissors, Search, UserRound, UserX, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { BookingTimeline, ButtonLoadingMorph, ConfirmSheet, ErrorState, IconButton, ResponsiveTable, StatusChip } from "@/components/kit";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { CancelBookingSheet } from "@/admin/components/cancel-booking-sheet";
import { DateRangePicker } from "@/admin/components/date-range-picker";
import { EmptyState } from "@/admin/components/empty-state";
import { FilterTabs } from "@/admin/components/filter-tabs";
import { SlideOver } from "@/admin/components/slide-over";
import { selectAppointmentsList } from "@/admin/lib/selectors";
import { dayTimeOf } from "@/admin/lib/safe-format";
import { formatDuration, formatMoney, formatPhone } from "@/lib/format";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { fetchAdminBookings, fetchAdminCancellationPreviewAsync, setAppointmentsQuery, setAppointmentsStatusFilter, updateAdminBookingStatus } from "@/store/admin-portal-slice";
import { AdminLayout } from "../portal/admin-layout";

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "STARTED", label: "In service" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO-SHOW", label: "No-show" },
];
const money = (n) => formatMoney(n, { decimals: !Number.isInteger(Math.round(Number(n || 0) * 100) / 100) });

/** Paid / refund / kept for cancelled bookings; total / discount / payable otherwise. */
function BookingMoney({ booking }) {
  const finances = booking.cancellationFinancials;
  if (booking.status === "CANCELLED" && finances) {
    const collected = Number(finances.collectedAmount ?? booking.payableAmount ?? 0);
    const refund = Number(finances.refundAmount ?? 0);
    const retained = Number(finances.retainedAmount ?? collected - refund);
    return (
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Paid", collected, "text-foreground"],
          ["Refunded", refund, "text-ink-info"],
          ["Kept", retained, "text-ink-success"],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl bg-muted/60 p-3">
            <dt className="text-micro font-semibold uppercase text-ink-neutral">{label}</dt>
            <dd className={cn("font-display text-base font-bold tabular-nums", tone)}>{money(value)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className="grid grid-cols-3 gap-2 text-center">
      {[
        ["Total", booking.totalAmount, "text-foreground"],
        ["Discount", booking.discountAmount, "text-ink-success"],
        ["Payable", booking.payableAmount, "text-foreground"],
      ].map(([label, value, tone]) => (
        <div key={label} className="rounded-2xl bg-muted/60 p-3">
          <dt className="text-micro font-semibold uppercase text-ink-neutral">{label}</dt>
          <dd className={cn("font-display text-base font-bold tabular-nums", tone)}>{money(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function AdminAppointmentsPage() {
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const appointments = useSelector(selectAppointmentsList);
  const { appointmentsFilter, appointmentsLoading, appointmentsError, appointmentsPagination } = useSelector((state) => state.adminPortal);
  const [searchText, setSearchText] = useState(() => params.get("q") ?? "");
  const [search, setSearch] = useState(() => params.get("q") ?? "");
  const [range, setRange] = useState({ from: "", to: "" });
  const [selectedId, setSelectedId] = useState(null);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const pendingOpen = useRef(params.get("booking"));
  const selected = appointments.find((b) => b.id === selectedId) ?? null;

  // Typing is debounced so the list isn't refetched per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const query = useCallback(
    (offset) => ({
      status: appointmentsFilter.status === "ALL" ? undefined : appointmentsFilter.status,
      search: search || undefined,
      from: range.from || undefined,
      to: range.to || undefined,
      limit: appointmentsPagination.limit,
      offset,
    }),
    [appointmentsFilter.status, search, range, appointmentsPagination.limit]
  );

  useEffect(() => {
    dispatch(setAppointmentsQuery({ search, from: range.from, to: range.to }));
    void dispatch(fetchAdminBookings(query(0)));
  }, [dispatch, query, search, range]);

  // Deep link from the dashboard or ⌘K: ?booking=<id> opens it once it is in the loaded page.
  useEffect(() => {
    const id = pendingOpen.current;
    if (id && appointments.some((b) => b.id === id)) {
      pendingOpen.current = null;
      setSelectedId(id);
      setParams((p) => {
        p.delete("booking");
        return p;
      }, { replace: true });
    }
  }, [appointments, setParams]);

  const refetch = useCallback(() => dispatch(fetchAdminBookings(query(appointmentsPagination.offset))), [dispatch, query, appointmentsPagination.offset]);

  const loadCancelPreview = useCallback(
    async (bookingId) => {
      const result = await dispatch(fetchAdminCancellationPreviewAsync(bookingId));
      return fetchAdminCancellationPreviewAsync.rejected.match(result) ? { ok: false, error: result.payload } : { ok: true, data: result.payload };
    },
    [dispatch]
  );
  const submitCancel = useCallback(
    async (bookingId, refundPercent) => {
      const result = await dispatch(updateAdminBookingStatus({ bookingId, status: "CANCELLED", refundPercent }));
      return updateAdminBookingStatus.rejected.match(result) ? { ok: false, error: result.payload } : { ok: true };
    },
    [dispatch]
  );

  async function markNoShow() {
    if (!selected) return;
    const result = await dispatch(updateAdminBookingStatus({ bookingId: selected.id, status: "NO-SHOW" }));
    if (updateAdminBookingStatus.rejected.match(result)) {
      notify.error(result.payload ?? "Could not mark as no-show");
      throw new Error("no-show failed");
    }
    notify.success("Marked as no-show", { description: selected.customer });
    setTimeout(() => setSelectedId(null), 700);
    void refetch();
  }

  function resetFilters() {
    setSearchText("");
    setSearch("");
    setRange({ from: "", to: "" });
    dispatch(setAppointmentsStatusFilter("ALL"));
  }

  const filtered = Boolean(search || range.from || range.to || appointmentsFilter.status !== "ALL");
  const { offset, limit, total } = appointmentsPagination;
  const canAct = selected && (selected.status === "PENDING" || selected.status === "CONFIRMED");

  const columns = useMemo(
    () => [
      {
        key: "customer",
        header: "Customer",
        primary: true,
        cell: (b) => (
          <span className="flex min-w-0 items-center gap-3">
            <AvatarBadge name={b.customer} size="sm" />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{b.customer}</span>
              <span className="block truncate text-caption text-ink-neutral md:hidden">{b.service}</span>
            </span>
          </span>
        ),
      },
      { key: "when", header: "When", secondary: true, cell: (b) => <span className="whitespace-nowrap tabular-nums">{dayTimeOf(b.startsAt)}</span> },
      { key: "service", header: "Service", hideOnMobile: true, cell: (b) => <span className="line-clamp-1">{b.service}</span> },
      { key: "stylist", header: "Stylist", cell: (b) => <span className="truncate">{b.stylistName ?? "Unassigned"}</span> },
      { key: "amount", header: "Payable", align: "right", cell: (b) => <span className="font-semibold tabular-nums">{money(b.payableAmount)}</span> },
      { key: "status", header: "Status", trailing: true, cell: (b) => <StatusChip status={b.status} booking={b} size="sm" /> },
    ],
    []
  );

  return (
    <AdminLayout pageTitle="Bookings" description="Every booking, live">
      <div className="space-y-4">
        {/* Filters */}
        <div className="space-y-3 rounded-card border border-border/60 bg-card p-3 shadow-soft sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search customer or service</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-neutral" aria-hidden />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Customer or service"
                className="h-11 w-full rounded-control bg-muted/60 pr-10 pl-10 text-sm ring-1 ring-inset ring-transparent outline-none transition-shadow placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal"
              />
              <AnimatePresence>
                {searchText ? (
                  <motion.button initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} type="button" aria-label="Clear search" onClick={() => setSearchText("")} className="tap absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-muted">
                    <X className="size-3.5" aria-hidden />
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </label>
            <div className="flex items-center gap-2">
              <DateRangePicker value={range} onChange={setRange} allowFuture anyLabel="Any date" label="Booking dates" className="min-w-0 flex-1 sm:flex-none" />
              <AnimatePresence initial={false}>
                {filtered ? (
                  <motion.span key="reset" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                    <IconButton icon={RotateCcw} label="Reset filters" variant="soft" onClick={resetFilters} />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <FilterTabs label="Booking status" options={STATUS_TABS} value={appointmentsFilter.status} onChange={(s) => dispatch(setAppointmentsStatusFilter(s))} className="min-w-0" />
            <span className="hidden shrink-0 text-caption font-semibold text-ink-neutral tabular-nums sm:block">{total} total</span>
          </div>
        </div>

        {appointmentsError && !appointments.length ? (
          <ErrorState title="Couldn't load bookings" description={appointmentsError} onRetry={() => refetch().unwrap()} />
        ) : (
          <ResponsiveTable
            caption="Bookings"
            columns={columns}
            rows={appointments}
            loading={appointmentsLoading}
            onRowClick={(b) => setSelectedId(b.id)}
            empty={
              <EmptyState
                illustration={filtered ? "search" : "calendar"}
                title={filtered ? "No matches" : "No bookings yet"}
                description={filtered ? "Try another filter." : "New bookings land here live."}
                actionLabel={filtered ? "Clear filters" : undefined}
                actionIcon={RotateCcw}
                onAction={resetFilters}
              />
            }
          />
        )}

        {total > limit ? (
          <div className="flex items-center justify-between gap-2">
            <p className="text-caption text-ink-neutral tabular-nums">
              {offset + 1}–{Math.min(offset + appointments.length, total)} of {total}
            </p>
            <div className="flex gap-2">
              <IconButton icon={ChevronLeft} label="Previous page" variant="outline" disabled={offset <= 0} onClick={() => dispatch(fetchAdminBookings(query(Math.max(offset - limit, 0))))} />
              <IconButton icon={ChevronRight} label="Next page" variant="outline" disabled={offset + limit >= total} onClick={() => dispatch(fetchAdminBookings(query(offset + limit)))} />
            </div>
          </div>
        ) : null}
      </div>

      {/* Details */}
      <SlideOver
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        title={selected?.customer ?? "Booking"}
        description={selected ? dayTimeOf(selected.startsAt) : undefined}
        icon={Scissors}
        size="lg"
        footer={
          canAct ? (
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:justify-end">
              <ButtonLoadingMorph variant="outline" icon={UserX} onClick={() => setNoShowOpen(true)}>
                No-show
              </ButtonLoadingMorph>
              <ButtonLoadingMorph
                variant="danger"
                icon={CircleX}
                onClick={() => {
                  const id = selected.id;
                  setSelectedId(null);
                  setCancelTargetId(id);
                }}
              >
                Cancel &amp; refund
              </ButtonLoadingMorph>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={selected.status} booking={selected} />
              <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-semibold text-ink-neutral">
                <Clock className="size-3.5" aria-hidden /> {formatDuration(selected.durationMinutes)}
              </span>
            </div>
            <BookingTimeline status={selected.status} times={selected.actualStartAt ? { STARTED: selected.actualStartAt } : {}} audience="staff" />

            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                [UserRound, "Stylist", selected.stylistName ?? "Unassigned"],
                [Phone, "Phone", selected.customerPhone ? formatPhone(selected.customerPhone) : "—", selected.customerPhone ? `tel:${selected.customerPhone}` : null],
                [Mail, "Email", selected.customerEmail || "—", selected.customerEmail ? `mailto:${selected.customerEmail}` : null],
                [Scissors, "Service", selected.service ?? "—"],
              ].map(([Icon, label, value, href]) => (
                <li key={label} className="flex min-w-0 items-center gap-3 rounded-2xl bg-muted/50 p-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card text-portal">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-micro font-semibold uppercase text-ink-neutral">{label}</span>
                    {href ? (
                      <a href={href} className="block truncate text-sm font-semibold text-portal hover:underline">
                        {value}
                      </a>
                    ) : (
                      <span className="block truncate text-sm font-semibold">{value}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <BookingMoney booking={selected} />

            {Array.isArray(selected.services) && selected.services.length ? (
              <ul className="divide-y divide-border/60 rounded-2xl ring-1 ring-inset ring-border/60">
                {selected.services.map((service) => (
                  <li key={service.id ?? service.name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{service.name}</span>
                    <span className="flex shrink-0 items-center gap-2 tabular-nums">
                      {Number(service.discountPercent ?? 0) ? <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-bold text-ink-success">−{Number(service.discountPercent)}%</span> : null}
                      {money(service.basePrice)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {canAct ? (
              <p className="flex items-start gap-2 text-caption text-ink-neutral">
                <CalendarX2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Start and complete happen on the stylist's screen.
              </p>
            ) : null}
            {/* Reschedule: there is no admin reschedule endpoint yet. When one exists, open a sheet here
                with the kit's <DateStrip> + <TimeSlotPicker> (DESIGN.md §6b) fed by the slots API. */}
          </div>
        ) : null}
      </SlideOver>

      <ConfirmSheet
        open={noShowOpen}
        onOpenChange={setNoShowOpen}
        kind="destructive"
        icon={UserX}
        title="Mark as no-show?"
        description={selected ? `${selected.customer} · ${dayTimeOf(selected.startsAt)}. No refund is issued.` : undefined}
        confirmLabel="Slide to mark no-show"
        cancelLabel="Keep booking"
        onConfirm={markNoShow}
      />

      <CancelBookingSheet bookingId={cancelTargetId} open={Boolean(cancelTargetId)} onOpenChange={(open) => !open && setCancelTargetId(null)} loadPreview={loadCancelPreview} submitCancel={submitCancel} onCancelled={() => void refetch()} />
    </AdminLayout>
  );
}
