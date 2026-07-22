const STATUS_CONFIG = {
  PENDING: { label: "Pending", tone: "amber" },
  CONFIRMED: { label: "Confirmed", tone: "blue" },
  STARTED: { label: "In service", tone: "primary" },
  COMPLETED: { label: "Completed", tone: "muted" },
  CANCELLED: { label: "Cancelled", tone: "destructive" },
};

export function getBookingStatusConfig(status) {
  const key = `${status ?? ""}`.trim().toUpperCase();
  return STATUS_CONFIG[key] ?? { label: status ?? "Unknown", tone: "muted" };
}

export function formatBookingTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatBookingDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount) {
  return `Rs ${Number(amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function isCriticalDelay(booking, nowMs = Date.now()) {
  if (booking?.status !== "STARTED") return false;
  const startedAt = new Date(booking.actualStartAt ?? booking.startsAt).getTime();
  if (!Number.isFinite(startedAt)) return false;
  const plannedMs = Number(booking.durationMinutes ?? 0) * 60 * 1000;
  const elapsedMs = Math.max(0, nowMs - startedAt);
  return elapsedMs - plannedMs > 10 * 60 * 1000;
}

export function maskEmail(email) {
  const value = `${email ?? ""}`.trim();
  if (!value.includes("@")) return "—";
  const [local, domain] = value.split("@");
  if (!local) return `***@${domain}`;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

export function maskPhone(phone) {
  const value = `${phone ?? ""}`.replace(/\s+/g, "");
  if (value.length < 4) return "—";
  return `${"*".repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
}

export function isTodayBooking(booking) {
  if (!booking?.startsAt) return false;
  const start = new Date(booking.startsAt);
  const now = new Date();
  return (
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate()
  );
}

export function computeOpsMetrics(bookings = [], queue = []) {
  const todayBookings = bookings.filter(isTodayBooking);
  const activeQueue = queue.filter((b) => ["PENDING", "CONFIRMED", "STARTED"].includes(b.status));
  const waiting = activeQueue.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status)).length;
  const inService = activeQueue.filter((b) => b.status === "STARTED").length;
  const todayRevenue = todayBookings
    .filter((b) => b.status !== "CANCELLED")
    .reduce((sum, b) => sum + Number(b.payableAmount ?? 0), 0);

  return {
    todayTotal: todayBookings.length,
    waiting,
    inService,
    todayRevenue,
    delayed: activeQueue.filter((b) => isCriticalDelay(b)).length,
  };
}

export function groupQueueByStatus(queue = []) {
  return {
    upcoming: queue.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status)),
    inService: queue.filter((b) => b.status === "STARTED"),
  };
}

export function computeStylistAvailability(stylists = [], queue = []) {
  const activeBookings = queue.filter((b) =>
    ["PENDING", "CONFIRMED", "STARTED"].includes(b.status)
  );

  return stylists.map((stylist) => {
    const inService = activeBookings.find(
      (b) => b.stylistId === stylist.id && b.status === "STARTED"
    );
    const upcoming = activeBookings.filter(
      (b) => b.stylistId === stylist.id && ["PENDING", "CONFIRMED"].includes(b.status)
    );

    let status = "available";
    if (inService) status = "busy";
    else if (upcoming.length) status = "upcoming";

    return {
      id: stylist.id,
      name: stylist.name,
      email: stylist.email ?? null,
      status,
      currentCustomer: inService?.customer ?? null,
      currentService: inService?.service ?? null,
      upcomingCount: upcoming.length,
    };
  });
}
