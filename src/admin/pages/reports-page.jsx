"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAdminRevenueReport, setReportsFilter } from "@/store/admin-portal-slice";
import { BarChart3, DollarSign, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AdminLayout } from "../portal/admin-layout";

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

    const { month, paymentMode, from, to } = reportsFilter;

    const todayIncomeLabel = useMemo(
        () => `Rs ${Number(reportSummary.dayTotal ?? 0).toFixed(2)}`,
        [reportSummary.dayTotal]
    );

    useEffect(() => {
        void dispatch(fetchAdminRevenueReport({
            month,
            paymentMode,
            from: from ? `${from}T00:00:00.000Z` : undefined,
            to: to ? `${to}T23:59:59.999Z` : undefined,
            limit: paymentsPagination.limit,
            offset: 0,
        }));
    }, [dispatch, month, paymentMode, from, to, paymentsPagination.limit]);

    function resetFilters() {
        dispatch(setReportsFilter({
            paymentMode: "ALL",
            from: "",
            to: "",
        }));
    }

    function onPrevPage() {
        if (paymentsPagination.offset <= 0) return;
        void dispatch(fetchAdminRevenueReport({
            month,
            paymentMode,
            from: from ? `${from}T00:00:00.000Z` : undefined,
            to: to ? `${to}T23:59:59.999Z` : undefined,
            limit: paymentsPagination.limit,
            offset: Math.max(paymentsPagination.offset - paymentsPagination.limit, 0),
        }));
    }

    function onNextPage() {
        const nextOffset = paymentsPagination.offset + paymentsPagination.limit;
        if (nextOffset >= paymentsPagination.total) return;
        void dispatch(fetchAdminRevenueReport({
            month,
            paymentMode,
            from: from ? `${from}T00:00:00.000Z` : undefined,
            to: to ? `${to}T23:59:59.999Z` : undefined,
            limit: paymentsPagination.limit,
            offset: nextOffset,
        }));
    }

    return (
      <AdminLayout
        pageTitle="Reports"
        actions={
          <>
            <div className="hidden rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-right sm:block">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Today&apos;s net income (live)</p>
              <p className="text-base font-bold text-primary">{todayIncomeLabel}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin-dashboard">Dashboard</Link>
            </Button>
          </>
        }
      >
        <div className="mb-4 rounded-lg border border-primary/40 bg-primary/10 p-3 sm:hidden">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today&apos;s net income (live)</p>
          <p className="text-2xl font-bold text-primary">{todayIncomeLabel}</p>
        </div>

        <Card>
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
              <Button type="button" size="sm" variant="outline" onClick={resetFilters}>Reset filters</Button>
              {reportsLoading ? <p className="text-xs text-muted-foreground">Loading...</p> : null}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reportCards.map((card) => {
            const Icon = reportIconMap[card.icon] ?? BarChart3;
            return (
              <Card key={card.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    {card.title}
                    <Icon className="size-4 text-primary"/>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.change}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Payment history</CardTitle>
            <p className="text-xs text-muted-foreground">
              {paymentsPagination.total} record(s) — collections add income; refunds show debt repaid to customers
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {latestPayments.length ? (
              <div className="overflow-x-auto rounded-md border">
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
                      <tr key={payment.id} className="border-b last:border-0">
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
            ) : (
              <p className="text-sm text-muted-foreground">No payments recorded for selected filters.</p>
            )}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Showing {paymentsPagination.offset + 1}-
                {Math.min(paymentsPagination.offset + latestPayments.length, paymentsPagination.total)} of {paymentsPagination.total}
              </p>
              <div className="space-x-2">
                <Button type="button" size="sm" variant="outline" onClick={onPrevPage} disabled={paymentsPagination.offset <= 0}>
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onNextPage}
                  disabled={paymentsPagination.offset + paymentsPagination.limit >= paymentsPagination.total}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
}
