import { toApiUrl } from "@/lib/api-base";
import { staffApiFetch } from "@/lib/staff-auth-client";

export async function downloadReceptionInvoice(bookingId) {
  const id = `${bookingId ?? ""}`.trim();
  if (!id) throw new Error("Booking id is required");

  const res = await staffApiFetch(toApiUrl(`/api/reception/bookings/${id}/invoice.pdf`), {
    method: "GET",
    headers: {},
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not download invoice");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `invoice-${id}.pdf`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
