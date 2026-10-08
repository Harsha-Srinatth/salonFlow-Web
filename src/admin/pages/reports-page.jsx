"use client";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Banknote, BarChart3, Calendar, CalendarRange, ChevronLeft, ChevronRight, Crown, CreditCard, Layers, Receipt, RotateCcw, Smartphone, TrendingUp, UserRound, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { notify } from "@/lib/notify";
import { AdminLayout } from "../portal/admin-layout";
import { ErrorState, IconButton, StatCard, TONE_CLASSES } from "@/components/kit";
import { SkeletonList, spring } from "@/components/motion";
import { BrushChart } from "@/admin/components/brush-chart";
import { dayEndIso, dayStartIso, DateRangePicker } from "@/admin/components/date-range-picker";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { FilterTabs } from "@/admin/components/filter-tabs";
import { Panel } from "@/admin/components/panel";
import { dayTimeOf } from "@/admin/lib/safe-format";
import { formatMoney } from "@/lib/format";
import { salonDateIso, salonDateOf } from "@/lib/salon-date";
import { cn } from "@/lib/utils";
import { fetchAdminRevenueReport, setReportsFilter } from "@/store/admin-portal-slice";

const MODES = [
  { value: "ALL", label: "All", icon: Layers },
  { value: "ONLINE", label: "Online", icon: CreditCard },
  { value: "OFFLINE_UPI", label: "UPI", icon: Smartphone },
  { value: "OFFLINE_CASH", label: "Cash", icon: Banknote },
];
const MODE_ICON = { ONLINE: CreditCard, OFFLINE_UPI: Smartphone, OFFLINE_CASH: Banknote };
const MODE_LABEL = { ONLINE: "Online", OFFLINE_UPI: "UPI", OFFLINE_CASH: "Cash" };

// Totals straight from the API summary (numbers, so the cards can count up).
const CARDS = [
  { key: "dayTotal", label: "Today", icon: Calendar, tone: "success" },
  { key: "weekTotal", label: "This week", icon: CalendarRange, tone: "primary" },
  { key: "monthTotal", label: "This month", icon: BarChart3, tone: "primary" },
  { key: "yearTotal", label: "This year", icon: TrendingUp, tone: "primary" },
  { key: "prevWeekTotal", label: "Last week", icon: RotateCcw, tone: "neutral" },
];

const inr = (n) => formatMoney(n);

function paymentKind(payment) {
  if (payment.isRefund || payment.sourceType === "REFUND") return { icon: ArrowUpRight, tone: TONE_CLASSES.info, title: "Refund" };
  if (payment.sourceType === "MEMBERSHIP") return { icon: Crown, tone: TONE_CLASSES.plum, title: "Membership" };
  if (payment.sourceType === "WALKIN") return { icon: UserRound, tone: TONE_CLASSES.primary, title: "Walk-in" };
  return { icon: ArrowDownLeft, tone: TONE_CLASSES.success, title: "Booking" };
}

function PaymentRow({ payment, index }) {
  const kind = paymentKind(payment);
  const Icon = kind.icon;
  const ModeIcon = MODE_ICON[payment.paymentMode] ?? Wallet;
  const signed = Number(payment.signedAmount ?? payment.amount ?? 0);
  const note = payment.bookingStatus === "CANCELLED" ? "Cancelled" : payment.bookingStatus === "NO-SHOW" ? "No-show" : "";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ ...spring.soft, delay: Math.min(index, 10) * 0.02 }}
      className="flex min-h-16 items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:px-4"
    >
      <span title={kind.title} className={cn("grid size-10 shrink-0 place-items-center rounded-2xl ring-1 ring-inset", kind.tone)}>
        <Icon className="size-4" aria-hidden />
        <span className="sr-only">{kind.title}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {payment.customerName}
          {note ? <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-ink-neutral">{note}</span> : null}
        </p>
        <p className="truncate text-caption text-ink-neutral">{payment.services ?? kind.title}</p>
      </div>
      <span title={MODE_LABEL[payment.paymentMode] ?? payment.paymentMode} className="hidden size-9 shrink-0 place-items-center rounded-xl bg-muted text-ink-neutral sm:grid">
        <ModeIcon className="size-4" aria-hidden />
        <span className="sr-only">{MODE_LABEL[payment.paymentMode] ?? payment.paymentMode}</span>
      </span>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-semibold tabular-nums", signed < 0 ? "text-ink-info" : "text-ink-success")}>
          {signed < 0 ? "−" : "+"} {inr(Math.abs(signed))}
        </p>
        <p className="text-[11px] text-ink-neutral">{dayTimeOf(payment.collectedAt)}</p>
      </div>
    </motion.li>
  );
}

export default function AdminReportsPage() {
  const dispatch = useDispatch();
  const reportCards = useSelector((state) => state.adminPortal.reportCards);
  const latestPayments = useSelector((state) => state.adminPortal.latestPayments);
  const reportSummary = useSelector((state) => state.adminPortal.reportSummary);
  const paymentsPagination = useSelector((state) => state.adminPortal.paymentsPagination);
  const reportsFilter = useSelector((state) => state.adminPortal.reportsFilter);
  const reportsLoading = useSelector((state) => state.adminPortal.reportsLoading);
  const [reportsError, setReportsError] = useState("");

  const { month, paymentMode, from, to } = reportsFilter;
  const filtered = Boolean(from || to) || paymentMode !== "ALL";

  const params = useCallback(
    (offset) => ({ month, paymentMode, from: dayStartIso(from), to: dayEndIso(to), limit: paymentsPagination.limit, offset }),
    [month, paymentMode, from, to, paymentsPagination.limit]
  );

  const runReportFetch = useCallback(
    async (p) => {
      const result = await dispatch(fetchAdminRevenueReport(p));
      if (fetchAdminRevenueReport.rejected.match(result)) {
        const message = result.payload ?? "Could not load revenue report";
        notify.error(message);
        setReportsError(message);
        throw new Error(message);
      }
      setReportsError("");
    },
    [dispatch]
  );

  useEffect(() => {
    void runReportFetch(params(0)).catch(() => {});
  }, [runReportFetch, params]);

  // Per calendar day: money collected (bars) and net after refunds (line), oldest first.
  const revenueSeries = useMemo(() => {
    const byDay = new Map();
    for (const payment of latestPayments) {
      const at = new Date(payment.collectedAt);
      if (Number.isNaN(at.getTime())) continue;
      // Salon calendar day (not the device's), as a UTC-midnight Date for the chart's time axis.
      const day = new Date(`${salonDateOf(at)}T00:00:00Z`);
      const signed = Number(payment.signedAmount ?? payment.amount ?? 0);
      const entry = byDay.get(day.getTime()) ?? { date: day, collected: 0, net: 0 };
      if (signed > 0) entry.collected += signed;
      entry.net += signed;
      byDay.set(day.getTime(), entry);
    }
    return [...byDay.values()].sort((a, b) => a.date - b.date).map((d) => ({ ...d, net: Math.max(0, d.net) }));
  }, [latestPayments]);

  const weekTrend = reportSummary.prevWeekTotal > 0 ? Math.round(((reportSummary.weekTotal - reportSummary.prevWeekTotal) / reportSummary.prevWeekTotal) * 100) : undefined;
  const { offset, limit, total } = paymentsPagination;

  const runOrNotify = (offset) => runReportFetch(params(offset)).catch(() => {});

  return (
    <AdminLayout
      pageTitle="Revenue"
      description="Income, refunds and receipts"
      actions={
        <span className="inline-flex h-9 items-center gap-2 rounded-full bg-success/12 px-3 text-sm font-bold text-ink-success ring-1 ring-inset ring-success/25" title="Today's net income">
          <span aria-hidden className="relative grid size-2 place-items-center">
            <span className="size-2 rounded-full bg-success" />
          </span>
          <span className="sr-only">Today</span>
          {inr(reportSummary.dayTotal)}
        </span>
      }
    >
      <div className="space-y-5">
        <ErrorBanner message={latestPayments.length ? reportsError : ""} onRetry={() => runReportFetch(params(offset))} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            value={{ from, to }}
            anyLabel="This month"
            onChange={({ from: f, to: t }) => dispatch(setReportsFilter({ from: f, to: t, ...(f ? { month: f.slice(0, 7) } : {}) }))}
          />
          <FilterTabs label="Payment mode" options={MODES} value={paymentMode} onChange={(value) => dispatch(setReportsFilter({ paymentMode: value }))} className="min-w-0" />
          <AnimatePresence initial={false}>
            {filtered ? (
              <motion.span key="reset" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <IconButton icon={RotateCcw} label="Reset filters" variant="soft" onClick={() => dispatch(setReportsFilter({ paymentMode: "ALL", from: "", to: "", month: salonDateIso().slice(0, 7) }))} />
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {CARDS.map((card, i) => (
            <StatCard
              key={card.key}
              icon={card.icon}
              label={card.label}
              value={Number(reportSummary[card.key] ?? 0)}
              format={(n) => formatMoney(n)}
              delta={card.key === "weekTotal" ? weekTrend : undefined}
              deltaLabel="vs last week"
              tone={card.tone}
              loading={reportsLoading && !reportCards.length}
              className={i === 0 ? "col-span-2 lg:col-span-1" : undefined}
            />
          ))}
        </div>

        {revenueSeries.length > 1 ? (
          <Panel title="Revenue" icon={TrendingUp} subtitle="Collected vs net after refunds">
            <BrushChart data={revenueSeries} />
          </Panel>
        ) : null}

        <Panel
          title="Payments"
          icon={Receipt}
          subtitle={`${total} receipts`}
          bodyClassName=""
          action={
            <div className="hidden items-center gap-3 text-[11px] font-semibold text-ink-neutral sm:flex">
              <span className="flex items-center gap-1"><ArrowDownLeft className="size-3 text-ink-success" aria-hidden /> In</span>
              <span className="flex items-center gap-1"><ArrowUpRight className="size-3 text-ink-info" aria-hidden /> Refund</span>
              <span className="flex items-center gap-1"><Crown className="size-3 text-ink-plum" aria-hidden /> Plan</span>
            </div>
          }
        >
          {reportsError && !latestPayments.length ? (
            <ErrorState compact title="Couldn't load payments" description={reportsError} onRetry={() => runReportFetch(params(offset))} />
          ) : reportsLoading && !latestPayments.length ? (
            <SkeletonList rows={4} className="p-4" />
          ) : !latestPayments.length ? (
            <EmptyState compact illustration="bag" title="No payments" description="Nothing in this period." className="bg-transparent" />
          ) : (
            <ul className="divide-y divide-border/60">
              <AnimatePresence initial={false}>
                {latestPayments.map((payment, index) => (
                  <PaymentRow key={payment.id} payment={payment} index={index} />
                ))}
              </AnimatePresence>
            </ul>
          )}

          {total > limit ? (
            <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3">
              <p className="text-caption text-ink-neutral tabular-nums">
                {offset + 1}–{Math.min(offset + latestPayments.length, total)} of {total}
              </p>
              <div className="flex gap-2">
                <IconButton icon={ChevronLeft} label="Previous page" variant="outline" disabled={offset <= 0} onClick={() => runOrNotify(Math.max(offset - limit, 0))} />
                <IconButton icon={ChevronRight} label="Next page" variant="outline" disabled={offset + limit >= total} onClick={() => runOrNotify(offset + limit)} />
              </div>
            </footer>
          ) : null}
        </Panel>
        {/* Invoices: the API exposes payments (receipts) only. A per-booking invoice endpoint would plug in
            here as a download action on each PaymentRow. */}
      </div>
    </AdminLayout>
  );
}
