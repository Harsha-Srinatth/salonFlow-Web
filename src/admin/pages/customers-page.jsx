"use client";
import { CalendarClock, Crown, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ResponsiveTable } from "@/components/kit";
import { AvatarBadge } from "@/admin/components/avatar-badge";
import { EmptyState } from "@/admin/components/empty-state";
import { ToneChip } from "@/admin/components/tone-chip";
import { selectAppointmentsList } from "@/admin/lib/selectors";
import { dayTimeOf } from "@/admin/lib/safe-format";
import { formatMoney, maskPhone } from "@/lib/format";
import { fetchAdminBookings } from "@/store/admin-portal-slice";
import { AdminLayout } from "../portal/admin-layout";

const RECENT = 100;

/**
 * Client roster. `adminPortal.customers` has no API behind it yet (extension point: a customers
 * endpoint would fill it and this table renders it as is). Until then the roster is built from the
 * most recent bookings, and labelled that way, so nothing is invented.
 */
export default function AdminCustomersPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const customers = useSelector((state) => state.adminPortal.customers);
  const bookings = useSelector(selectAppointmentsList);
  const loading = useSelector((state) => state.adminPortal.appointmentsLoading);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!customers.length) void dispatch(fetchAdminBookings({ limit: RECENT, offset: 0, sort: "latest" }));
  }, [customers.length, dispatch]);

  const derived = useMemo(() => {
    const map = new Map();
    for (const b of bookings) {
      if (!b.customer) continue;
      const key = `${b.customer}|${b.customerPhone ?? ""}`;
      const row = map.get(key) ?? { id: key, name: b.customer, phone: b.customerPhone, visits: 0, totalSpent: 0, last: null };
      row.visits += b.status === "COMPLETED" ? 1 : 0;
      if (b.status === "COMPLETED") row.totalSpent += Number(b.payableAmount ?? 0);
      if (!row.last || new Date(b.startsAt) > new Date(row.last)) row.last = b.startsAt;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => new Date(b.last) - new Date(a.last));
  }, [bookings]);

  const fromApi = customers.length > 0;
  const rows = (fromApi ? customers : derived).filter((c) => !q.trim() || `${c.name} ${c.phone ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  const columns = [
    { key: "name", header: "Customer", primary: true, cell: (c) => <span className="flex min-w-0 items-center gap-3"><AvatarBadge name={c.name} size="sm" /><span className="truncate font-semibold">{c.name}</span></span> },
    { key: "phone", header: "Phone", secondary: true, cell: (c) => (c.phone ? maskPhone(c.phone) : "—") },
    { key: "visits", header: "Visits", align: "right", cell: (c) => <span className="tabular-nums">{c.visits ?? 0}</span> },
    { key: "spent", header: "Spent", align: "right", cell: (c) => <span className="font-semibold tabular-nums">{formatMoney(c.totalSpent)}</span> },
    fromApi
      ? { key: "status", header: "Tier", trailing: true, cell: (c) => (c.status === "vip" ? <ToneChip tone="gold" icon={Crown} size="sm">VIP</ToneChip> : <ToneChip size="sm">Regular</ToneChip>) }
      : { key: "last", header: "Last booking", trailing: true, cell: (c) => <span className="text-caption text-ink-neutral tabular-nums">{dayTimeOf(c.last)}</span> },
  ];

  return (
    <AdminLayout pageTitle="Customers" description={fromApi ? "Client roster" : `From the last ${RECENT} bookings`}>
      <div className="space-y-4">
        <label className="relative block">
          <span className="sr-only">Search customers</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-neutral" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or phone" className="h-11 w-full rounded-control bg-card pr-4 pl-10 text-sm shadow-soft ring-1 ring-inset ring-border/60 outline-none placeholder:text-ink-neutral focus-visible:ring-2 focus-visible:ring-portal sm:max-w-sm" />
        </label>
        <ResponsiveTable
          caption="Customers"
          columns={columns}
          rows={rows}
          loading={loading && !rows.length}
          onRowClick={(c) => navigate(`/admin-dashboard/appointments?q=${encodeURIComponent(c.name)}`)}
          empty={<EmptyState illustration={q ? "search" : "sparkle"} icon={Users} title={q ? "No matches" : "No customers yet"} description={q ? undefined : "They appear after their first booking."} actionLabel={q ? undefined : "Open bookings"} actionIcon={CalendarClock} onAction={() => navigate("/admin-dashboard/appointments")} />}
        />
      </div>
    </AdminLayout>
  );
}
