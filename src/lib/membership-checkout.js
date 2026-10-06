import { loadRazorpayCheckout } from "@/lib/razorpay-checkout";

/**
 * Razorpay Checkout for a membership plan. The backend prices the plan and creates the order; the
 * browser only opens Checkout and then *reports* what Checkout said. "Active" is shown only when the
 * backend's own status says so.
 *
 * Resolves `{ outcome, status }` where outcome is one of ACTIVE | PENDING | FAILED | EXPIRED | REVIEW |
 * DISMISSED (window closed with no payment) and status is the backend DTO. Rejects `{ message }` when
 * the payment could not even be started.
 */
async function postJson(request, path, body) {
  const response = await request(path, { method: "POST", body: JSON.stringify(body ?? {}) });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function fetchStatus(request, orderId) {
  const response = await request(`/api/customer/membership/orders/${encodeURIComponent(orderId)}/status`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error ?? "Could not check payment status"), { status: response.status });
  return data;
}

/** Polls until the payment settles (or `timeoutMs`), so a slow webhook/UPI app does not leave the page guessing. */
export async function pollMembershipStatus(request, orderId, { intervalMs = 3000, timeoutMs = 90000, onUpdate } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  for (;;) {
    try {
      last = await fetchStatus(request, orderId);
      onUpdate?.(last);
      if (last.state !== "PENDING") return last;
    } catch (error) {
      if (error?.status === 404 || error?.status === 401) throw error;
    }
    if (Date.now() >= deadline) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export async function runMembershipCheckout({ request, segment, onPhase, brandName = "Sahasra Salon" }) {
  onPhase?.("starting");
  let created;
  try {
    created = await postJson(request, "/api/customer/membership/checkout", { segment });
  } catch {
    throw { message: "Could not reach the server. Check your connection and try again." };
  }
  if (!created.ok) throw { message: created.data.error ?? "Could not start the payment" };
  const order = created.data;

  onPhase?.("loading_checkout");
  let Razorpay;
  try {
    Razorpay = await loadRazorpayCheckout();
  } catch {
    throw { message: "Could not load the payment window. Check your connection and try again." };
  }

  return new Promise((resolve) => {
    let finished = false;
    const finish = (status, outcome) => {
      if (finished) return;
      finished = true;
      resolve({ outcome: outcome ?? status?.state ?? "PENDING", status });
    };
    const fallback = async () => {
      try {
        return await fetchStatus(request, order.orderId);
      } catch {
        return { state: "PENDING", message: "We could not confirm your payment yet. Your membership is not active until we do.", orderId: order.orderId, plan: order.plan };
      }
    };

    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      name: brandName,
      description: order.description,
      prefill: order.prefill,
      theme: { color: "#7c3aed" },
      config: {
        display: {
          blocks: { upi: { name: "Pay with UPI", instruments: [{ method: "upi" }] } },
          sequence: ["block.upi"],
          preferences: { show_default_blocks: true },
        },
      },
      timeout: order.timeoutSeconds,
      retry: { enabled: true, max_count: 3 },
      modal: {
        confirmclose: true,
        escape: false,
        ondismiss: async () => {
          if (finished) return;
          // Closing is a hint, not a result: ask the backend, which checks Razorpay in case a payment is in flight.
          onPhase?.("verifying");
          const status = await fallback();
          finish(status, status.state === "PENDING" ? "DISMISSED" : status.state);
        },
      },
      handler: async (response) => {
        onPhase?.("verifying");
        try {
          const { ok, data, status } = await postJson(request, "/api/customer/membership/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (ok) return finish(data);
          if (status === 400) return finish({ state: "FAILED", message: "We could not verify this payment. If money was deducted it will be returned automatically.", orderId: order.orderId, plan: order.plan });
          finish(await fallback());
        } catch {
          // Network dropped after paying: ask the backend, never guess.
          finish(await fallback());
        }
      },
    });

    try {
      checkout.open();
      onPhase?.("checkout");
    } catch {
      finish({ state: "FAILED", message: "Could not open the payment window. Please try again.", orderId: order.orderId, plan: order.plan });
    }
  });
}
