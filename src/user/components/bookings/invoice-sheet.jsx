import { CalendarClock, Download, ReceiptText, UserRound } from "lucide-react";
import { ResponsiveModal, StatusChip } from "@/components/kit";
import { formatMoney } from "@/lib/format";
import { formatSalonDateTime } from "@/lib/salon-date";
import { toApiUrl } from "@/lib/api-base";

/**
 * Invoice view: the booking's billed figures at a glance plus the server-generated PDF
 * (GET /api/customer/bookings/:id/invoice.pdf, same link the old History page used).
 */
export function InvoiceSheet({ open, onOpenChange, booking }) {
  if (!booking) return null;
  const paid = Number(booking.payableAmount ?? 0);
  const discount = Number(booking.discountAmount ?? 0);
  const services = `${booking.service ?? ""}`.split(/,\s*/).filter(Boolean);
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Invoice"
      icon={ReceiptText}
      size="sm"
      footer={
        <a
          href={toApiUrl(`/api/customer/bookings/${booking.id}/invoice.pdf`)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-portal text-sm font-semibold text-portal-foreground shadow-soft hover:shadow-glow"
        >
          <Download className="size-4" aria-hidden /> Download PDF
        </a>
      }
    >
      <div className="relative overflow-hidden rounded-2xl bg-card p-4 ring-1 ring-inset ring-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <CalendarClock className="size-4 text-portal" aria-hidden /> {formatSalonDateTime(booking.startsAt)}
            </p>
            {booking.stylistName ? (
              <p className="flex items-center gap-2 text-ink-neutral">
                <UserRound className="size-4" aria-hidden /> {booking.stylistName}
              </p>
            ) : null}
          </div>
          <StatusChip status={booking.status} booking={booking} audience="customer" size="sm" />
        </div>
        <ul className="mt-4 space-y-1.5 border-t border-dashed border-border pt-3 text-sm">
          {services.map((name) => (
            <li key={name} className="truncate font-medium">
              {name}
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-dashed border-border pt-3 text-sm">
          {discount > 0 ? (
            <div className="flex justify-between text-ink-success">
              <dt>Discount</dt>
              <dd className="font-semibold tabular-nums">−{formatMoney(discount)}</dd>
            </div>
          ) : null}
          <div className="flex items-end justify-between">
            <dt className="font-semibold">Amount</dt>
            <dd className="font-display text-title font-bold tabular-nums">{formatMoney(paid)}</dd>
          </div>
        </dl>
      </div>
    </ResponsiveModal>
  );
}
