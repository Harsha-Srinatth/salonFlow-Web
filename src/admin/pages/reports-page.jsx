"use client";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Banknote, BarChart3, Calendar, CalendarRange, ChevronLeft, ChevronRight, Crown, CreditCard, Layers, Receipt, RotateCcw, Smartphone, TrendingUp, UserRound, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "@/lib/notify";
import { AdminLayout } from "../portal/admin-layout";
import { Button } from "@/components/ui/button";
import { BrushChart } from "@/admin/components/brush-chart";
import { dayEndIso, dayStartIso, DateRangePicker } from "@/admin/components/date-range-picker";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { StatCard } from "@/admin/components/stat-card";
import { SegmentedControl } from "@/components/fx/segmented-control";
import { LoadingOrb } from "@/components/shared/loading-orb";
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

// Short card titles: the long ones came from the API.
const CARD_VIEW = {
  "Today Net Income": { label: "Today", icon: Calendar },
  "This Week Net": { label: "This week", icon: CalendarRange },
  "This Month Net": { label: "This month", icon: BarChart3 },
  "This Year Net": { label: "This year", icon: TrendingUp },
  "Previous Week Net": { label: "Last week", icon: RotateCcw },
};

const inr = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const when = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

function paymentKind(payment) {
  if (payment.isRefund || payment.sourceType === "REFUND") return { icon: ArrowUpRight, tone: "bg-destructive/10 text-destructive", title: "Refund" };
  if (payment.sourceType === "MEMBERSHIP") return { icon: Crown, tone: "bg-accent/15 text-accent", title: "Membership" };
  if (payment.sourceType === "WALKIN") return { icon: UserRound, tone: "bg-primary/10 text-primary", title: "Walk-in" };
  return { icon: ArrowDownLeft, tone: "bg-success/10 text-success", title: "Booking" };
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
      transition={{ type: "spring", stiffness: 380, damping: 32, delay: Math.min(index, 10) * 0.015 }}
      className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:px-4"
    >
      <span title={kind.title} className={cn("grid size-9 shrink-0 place-items-center rounded-full", kind.tone)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {payment.customerName}
          {note ? <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{note}</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">{payment.services ?? kind.title}</p>
      </div>
      <span title={MODE_LABEL[payment.paymentMode] ?? payment.paymentMode} className="hidden size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground sm:grid">
        <ModeIcon className="size-4" />
      </span>
      <div className="shrink-0 text-right">
        <p className={cn("text-sm font-semibold tabular-nums", signed < 0 ? "text-destructive" : "text-success")}>
          {signed < 0 ? "-" : "+"} {inr(Math.abs(signed))}
        </p>
        <p className="text-[11px] text-muted-foreground">{when(payment.collectedAt)}</p>
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
        toast.error(message);
        setReportsError(message);
        return;
      }
      setReportsError("");
    },
    [dispatch]
  );

  useEffect(() => {
    void runReportFetch(params(0));
  }, [runReportFetch, params]);

  // Per calendar day: money collected (bars) and net after refunds (line), oldest first.
  const revenueSeries = useMemo(() => {
    const byDay = new Map();
    for (const payment of latestPayments) {
      const at = new Date(payment.collectedAt);
      if (Number.isNaN(at.getTime())) continue;
      const day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
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

  return (
    <AdminLayout
      pageTitle="Reports"
      description="Revenue, collections and refunds."
      actions={
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary" title="Today's net income">
          <span className="admin-live-dot relative inline-flex size-1.5 rounded-full bg-primary text-primary" />
          {inr(reportSummary.dayTotal)}
        </span>
      }
    >
      <div className="space-y-5">
        <ErrorBanner message={reportsError} onRetry={() => void runReportFetch(params(offset))} />

        {/* Filters: one row, no labels to read */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <DateRangePicker
            value={{ from, to }}
            anyLabel="This month"
            onChange={({ from: f, to: t }) => dispatch(setReportsFilter({ from: f, to: t, ...(f ? { month: f.slice(0, 7) } : {}) }))}
          />
          <div className="max-w-full overflow-x-auto pb-1 sm:pb-0">
            <SegmentedControl label="Payment mode" options={MODES} value={paymentMode} onChange={(value) => dispatch(setReportsFilter({ paymentMode: value }))} />
          </div>
          <AnimatePresence initial={false}>
            {filtered ? (
              <motion.button
                key="reset"
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => dispatch(setReportsFilter({ paymentMode: "ALL", from: "", to: "", month: new Date().toISOString().slice(0, 7) }))}
                aria-label="Reset filters"
                title="Reset filters"
                className="grid size-10 place-items-center rounded-xl border bg-card text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-4" />
              </motion.button>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
          {reportCards.map((card, i) => {
            const view = CARD_VIEW[card.title] ?? { label: card.title, icon: BarChart3 };
            return <StatCard key={card.title} icon={view.icon} label={view.label} display={card.value.replace(/^Rs\s*/, "Rs ").replace(/\.00$/, "")} trend={view.label === "This week" ? weekTrend : undefined} tone={view.label === "Today" ? "success" : "primary"} delay={i * 40} className={i === 0 ? "col-span-2 lg:col-span-1" : undefined} />;
          })}
        </div>

        {revenueSeries.length > 1 ? (
          <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="admin-shadow-sm rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
              <TrendingUp className="size-4 text-primary" /> Revenue
            </h2>
            <BrushChart data={revenueSeries} />
          </motion.section>
        ) : null}

        <section className="admin-shadow-sm overflow-hidden rounded-2xl border border-border/70 bg-card">
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Receipt className="size-4 text-primary" /> Payments
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{total}</span>
            </h2>
            <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1"><ArrowDownLeft className="size-3 text-success" /> In</span>
              <span className="flex items-center gap-1"><ArrowUpRight className="size-3 text-destructive" /> Refund</span>
              <span className="flex items-center gap-1"><Crown className="size-3 text-accent" /> Plan</span>
            </div>
          </header>

          {reportsLoading && !latestPayments.length ? (
            <LoadingOrb compact label="Loading payments…" />
          ) : !latestPayments.length ? (
            <div className="p-4">
              <EmptyState icon={Receipt} compact title="No payments" description="Nothing in this period." />
            </div>
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
              <p className="text-xs tabular-nums text-muted-foreground">
                {offset + 1}–{Math.min(offset + latestPayments.length, total)} of {total}
              </p>
              <div className="flex gap-1.5">
                <Button type="button" size="icon" variant="outline" aria-label="Previous page" disabled={offset <= 0} onClick={() => void runReportFetch(params(Math.max(offset - limit, 0)))}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" aria-label="Next page" disabled={offset + limit >= total} onClick={() => void runReportFetch(params(offset + limit))}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </footer>
          ) : null}
        </section>
      </div>
    </AdminLayout>
  );
}
