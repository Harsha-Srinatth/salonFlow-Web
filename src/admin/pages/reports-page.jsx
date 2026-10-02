"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/admin/components/empty-state";
import { ErrorBanner } from "@/admin/components/error-banner";
import { SkeletonRows } from "@/admin/components/skeleton";
import { StatCard } from "@/admin/components/stat-card";
import { useRevealOnReady } from "@/admin/lib/motion";
import { fetchAdminRevenueReport, setReportsFilter } from "@/store/admin-portal-slice";
import { BarChart3, ChevronLeft, ChevronRight, DollarSign, Receipt, RotateCw, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { AdminLayout } from "../portal/admin-layout";
import { LoadingOrb } from "@/components/shared/loading-orb";

const reportIconMap = {
    DollarSign,
    TrendingUp,
    BarChart3,
    Users,
};

const PAYMENT_MODE_OPTIONS = [
    { value: "ALL", label: "All modes" },
    { value: "ONLINE", label: "Online" },
    { value: "OFFLINE_UPI", label: "UPI" },
    { value: "OFFLINE_CASH", label: "Hand cash" },
];

function formatPaymentMode(mode) {
    if (mode === "ONLINE") return "Online";
    if (mode === "OFFLINE_UPI") return "UPI";
    if (mode === "OFFLINE_CASH") return "Hand cash";
    return mode ?? "—";
}

function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString([], {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatPaymentType(payment) {
    if (payment.transactionLabel) return payment.transactionLabel;
    if (payment.isRefund || payment.sourceType === "REFUND") return "Refund (Repay to customer)";
    if (payment.sourceType === "WALKIN") return "Walk-in collection";
    return "Booking collection";
}

function formatSignedAmount(payment) {
    const signed = Number(payment.signedAmount ?? payment.amount ?? 0);
    const prefix = signed < 0 ? "- " : "+ ";
    return `${prefix}Rs ${Math.abs(signed).toFixed(2)}`;
}

export default function AdminReportsPage() {
    const dispatch = useDispatch();
    const reportCards = useSelector((state) => state.adminPortal.reportCards);
    const latestPayments = useSelector((state) => state.adminPortal.latestPayments);
    const reportSummary = useSelector((state) => state.adminPortal.reportSummary);
    const paymentsPagination = useSelector((state) => state.adminPortal.paymentsPagination);
    const reportsFilter = useSelector((state) => state.adminPortal.reportsFilter);
    const reportsLoading = useSelector((state) => state.adminPortal.reportsLoading);
    const realtimeConnected = useSelector((state) => state.adminPortal.realtimeConnected);
    const [reportsError, setReportsError] = useState("");
    const cardsRef = useRevealOnReady([reportCards.length], { selector: ":scope > *" });

    const { month, paymentMode, from, to } = reportsFilter;

    const todayIncomeLabel = useMemo(
        () => `Rs ${Number(reportSummary.dayTotal ?? 0).toFixed(2)}`,
        [reportSummary.dayTotal]
    );

    async function runReportFetch(params) {
        const result = await dispatch(fetchAdminRevenueReport(params));
        if (fetchAdminRevenueReport.rejected.match(result)) {
            const message = result.payload ?? "Could not load revenue report";
            if (!params.silent) toast.error(message);
            setReportsError(message);
            return;
        }
        setReportsError("");
    }

    useEffect(() => {
        void runReportFetch({
            month,
            paymentMode,
            from: from ? `${from}T00:00:00.000Z` : undefined,
            to: to ? `${to}T23:59:59.999Z` : undefined,
            limit: paymentsPagination.limit,
            offset: 0,
        });
    }, [dispatch, month, paymentMode, from, to, paymentsPagination.limit]);

    function resetFilters() {
        dispatch(setReportsFilter({
            paymentMode: "ALL",
            from: "",
            to: "",
        }));
    }

    function retryLoad() {
        void runReportFetch({
            month,
            paymentMode,
            from: from ? `${from}T00:00:00.000Z` : undefined,
            to: to ? `${to}T23:59:59.999Z` : undefined,
            limit: paymentsPagination.limit,
            offset: paymentsPagination.offset,
        });
    }

    function onPrevPage() {
        if (paymentsPagination.offset <= 0) return;
        void runReportFetch({
            month,
            paymentMode,
            from: from ? `${from}T00:00:00.000Z` : undefined,
            to: to ? `${to}T23:59:59.999Z` : undefined,
            limit: paymentsPagination.limit,
            offset: Math.max(paymentsPagination.offset - paymentsPagination.limit, 0),
        });
    }

    function onNextPage() {
        const nextOffset = paymentsPagination.offset + paymentsPagination.limit;
        if (nextOffset >= paymentsPagination.total) return;
        void runReportFetch({
            month,
            paymentMode,
            from: from ? `${from}T00:00:00.000Z` : undefined,
            to: to ? `${to}T23:59:59.999Z` : undefined,
            limit: paymentsPagination.limit,
            offset: nextOffset,
        });
    }

    return (
      <AdminLayout
        pageTitle="Reports"
        description="Revenue, collections, and refunds across the salon."
        actions={
          <>
            <div className="hidden rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-right sm:block">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Today&apos;s net income (live)</p>
              <p className="text-base font-bold text-primary">{todayIncomeLabel}</p>
            </div>
          </>
        }
      >
        <div className="space-y-4">
        <div className="admin-hero-surface admin-shadow-md rounded-2xl p-4 text-primary-foreground sm:hidden">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/80">Today&apos;s net income (live)</p>
          <p className="text-2xl font-bold">{todayIncomeLabel}</p>
        </div>

        <ErrorBanner message={reportsError} onRetry={retryLoad} />

        <Card className="admin-shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Revenue filters</CardTitle>
            <p className="text-xs text-muted-foreground">
              Realtime: {realtimeConnected ? "Connected — updates automatically" : "Disconnected — refresh page if needed"}
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground" htmlFor="report-month">Month</label>
              <input
                id="report-month"
                type="month"
                value={month}
                onChange={(event) => dispatch(setReportsFilter({ month: event.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground" htmlFor="payment-mode">Payment mode</label>
              <select
                id="payment-mode"
                value={paymentMode}
                onChange={(event) => dispatch(setReportsFilter({ paymentMode: event.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {PAYMENT_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground" htmlFor="from-date">From date</label>
              <input
                id="from-date"
                type="date"
                value={from}
                onChange={(event) => dispatch(setReportsFilter({ from: event.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground" htmlFor="to-date">To date</label>
              <input
                id="to-date"
                type="date"
                value={to}
                onChange={(event) => dispatch(setReportsFilter({ to: event.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
              <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
                <RotateCw className="size-3.5" />
                Reset filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div ref={cardsRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {reportCards.map((card) => {
            const Icon = reportIconMap[card.icon] ?? BarChart3;
            return (
              <StatCard
                key={card.title}
                icon={Icon}
                label={card.title}
                display={card.value}
                trendLabel={card.change}
                tone="primary"
              />
            );
          })}
        </div>

        <Card className="admin-shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2"><Receipt className="size-4 text-primary" />Payment history</CardTitle>
            <p className="text-xs text-muted-foreground">
              {paymentsPagination.total} record(s) — collections add income; refunds show debt repaid to customers
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {reportsLoading && !latestPayments.length ? <SkeletonRows count={4} /> : null}
            {latestPayments.length ? (
              <>
                {/* Table — sm and up */}
                <div className="hidden overflow-x-auto rounded-lg border sm:block">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Customer</th>
                        <th className="px-3 py-2 font-medium">Phone</th>
                        <th className="px-3 py-2 font-medium">Services</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Mode</th>
                        <th className="px-3 py-2 font-medium">Date & time</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestPayments.map((payment) => {
                        const isRefund = payment.isRefund || payment.sourceType === "REFUND";
                        return (
                        <tr key={payment.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                          <td className="px-3 py-3 font-medium">{payment.customerName}</td>
                          <td className="px-3 py-3 text-muted-foreground">{payment.customerPhone || "—"}</td>
                          <td className="px-3 py-3 text-muted-foreground">{payment.services ?? "—"}</td>
                          <td className="px-3 py-3">
                            <Badge variant={isRefund ? "destructive" : "secondary"} className="font-normal">
                              {formatPaymentType(payment)}
                            </Badge>
                            {payment.bookingStatus === "CANCELLED" ? (
                              <p className="mt-1 text-[10px] uppercase text-muted-foreground">Cancelled booking</p>
                            ) : null}
                            {payment.bookingStatus === "NO-SHOW" ? (
                              <p className="mt-1 text-[10px] uppercase text-muted-foreground">Client did not visit</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="outline">{formatPaymentMode(payment.paymentMode)}</Badge>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{formatDateTime(payment.collectedAt)}</td>
                          <td className={`px-3 py-3 text-right font-medium ${isRefund ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
                            {formatSignedAmount(payment)}
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>

                {/* Card list — mobile */}
                <div className="space-y-2.5 sm:hidden">
                  {latestPayments.map((payment) => {
                    const isRefund = payment.isRefund || payment.sourceType === "REFUND";
                    return (
                      <div key={payment.id} className="admin-shadow-sm rounded-xl border border-border/70 bg-card p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{payment.customerName}</p>
                            <p className="text-xs text-muted-foreground">{payment.customerPhone || "—"}</p>
                          </div>
                          <p className={`shrink-0 text-sm font-semibold ${isRefund ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}>
                            {formatSignedAmount(payment)}
                          </p>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant={isRefund ? "destructive" : "secondary"} className="font-normal">
                            {formatPaymentType(payment)}
                          </Badge>
                          <Badge variant="outline">{formatPaymentMode(payment.paymentMode)}</Badge>
                          {payment.bookingStatus === "CANCELLED" ? (
                            <span className="text-[10px] uppercase text-muted-foreground">Cancelled booking</span>
                          ) : null}
                          {payment.bookingStatus === "NO-SHOW" ? (
                            <span className="text-[10px] uppercase text-muted-foreground">Client did not visit</span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{payment.services ?? "—"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(payment.collectedAt)}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : !reportsLoading ? (
              <EmptyState icon={Receipt} title="No payments recorded" description="No payments match the selected filters yet." />
            ) : null}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing {paymentsPagination.offset + 1}-
                {Math.min(paymentsPagination.offset + latestPayments.length, paymentsPagination.total)} of {paymentsPagination.total}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={onPrevPage} disabled={paymentsPagination.offset <= 0}>
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  onClick={onNextPage}
                  disabled={paymentsPagination.offset + paymentsPagination.limit >= paymentsPagination.total}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </AdminLayout>
    );
}
