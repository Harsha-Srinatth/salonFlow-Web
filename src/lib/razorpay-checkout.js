/**
 * Razorpay Checkout driver. Framework-free: the caller passes `request(path, init)`, an
 * authenticated fetch that returns a Response, so this file knows nothing about sessions.
 *
 * The browser is never the source of truth. It asks the backend for an order (the backend prices
 * the booking), opens Checkout with that order id, and afterwards only *reports* what Checkout
 * said. "Booking confirmed" is shown only when the backend's status says CONFIRMED.
 */

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const PENDING_KEY = "sahasra.pendingPayment";

let scriptPromise = null;

export function loadRazorpayCheckout() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => (window.Razorpay ? resolve(window.Razorpay) : reject(new Error("checkout unavailable")));
      script.onerror = () => {
        scriptPromise = null; // allow a retry after a network blip
        reject(new Error("checkout script failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

/** Terminal = nothing more will change without the customer doing something new. */
export function isTerminalState(state) {
  return ["CONFIRMED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDING", "REFUNDED"].includes(state);
}

export function rememberPendingPayment(orderId) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ orderId, at: Date.now() }));
  } catch {
    /* storage can be blocked; resuming after refresh is a convenience only */
  }
}

export function readPendingPayment() {
  try {
    const value = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null");
    if (value?.orderId && Date.now() - value.at < 6 * 60 * 60 * 1000) return value;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPendingPayment() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export async function fetchPaymentStatus(request, orderId) {
  const response = await request(`/api/payments/razorpay/${encodeURIComponent(orderId)}/status`);
  const data = await readJson(response);
  if (!response.ok) throw Object.assign(new Error(data.error ?? "Could not check payment status"), { status: response.status });
  return data;
}

/**
 * Polls the backend until the payment reaches a terminal state or `timeoutMs` passes (then the
 * last known state — PENDING/PROCESSING — is returned and the UI keeps saying "not confirmed yet").
 */
export async function pollPaymentStatus(request, orderId, { intervalMs = 3000, timeoutMs = 120000, onUpdate, shouldStop } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  for (;;) {
    try {
      last = await fetchPaymentStatus(request, orderId);
      onUpdate?.(last);
      if (isTerminalState(last.state)) return last;
    } catch (error) {
      if (error?.status === 404 || error?.status === 401) throw error;
      // transient network error: keep trying until the deadline
    }
    if (shouldStop?.() || Date.now() >= deadline) return last;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

async function postJson(request, path, body) {
  const response = await request(path, { method: "POST", body: JSON.stringify(body ?? {}) });
  const data = await readJson(response);
  return { ok: response.ok, status: response.status, data };
}

/**
 * Runs one payment attempt for a booking request.
 *
 * Resolves with `{ outcome, status }`:
 *  - NO_PAYMENT_REQUIRED  nothing is owed (fully covered by credit/voucher): caller books directly
 *  - then `status` is the backend's payment DTO; `status.state` is one of
 *    CONFIRMED | PENDING | PROCESSING | FAILED | CANCELLED | EXPIRED | REFUNDING | REFUNDED | AWAITING_PAYMENT
 * Rejects with `{ message, alternatives? }` when the payment could not even be started.
 *
 * @param {{ request: Function, payload: object, onPhase?: (phase: string) => void, brandName?: string }} options
 */
export async function runRazorpayPayment({ request, payload, onPhase, brandName = "Sahasra Salon" }) {
  onPhase?.("starting");
  let created;
  try {
    created = await postJson(request, "/api/payments/razorpay/orders", payload);
  } catch {
    throw { message: "Could not reach the server. Check your connection and try again." };
  }
  if (!created.ok) {
    throw { message: created.data.error ?? "Could not start the payment", alternatives: created.data.alternatives ?? [] };
  }
  const order = created.data;
  if (order.paymentRequired === false) return { outcome: "NO_PAYMENT_REQUIRED", status: null };
  if (order.state && !order.keyId) {
    // The backend already knows how this payment ended (e.g. it was paid in another tab).
    return { outcome: order.state, status: order };
  }

  rememberPendingPayment(order.orderId);
  onPhase?.("loading_checkout");
  let Razorpay;
  try {
    Razorpay = await loadRazorpayCheckout();
  } catch {
    throw { message: "Could not load the payment window. Check your connection and try again." };
  }

  return new Promise((resolve) => {
    let finished = false;
    let stopWatching = () => {};
    const finish = (status) => {
      if (finished) return;
      finished = true;
      stopWatching();
      resolve({ outcome: status?.state ?? "PENDING", status });
    };
    const fallbackStatus = async () => {
      try {
        return await fetchPaymentStatus(request, order.orderId);
      } catch {
        return { state: "PENDING", message: "We could not confirm your payment yet. Your booking is not confirmed.", orderId: order.orderId };
      }
    };

    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      name: brandName,
      description: order.description,
      prefill: order.prefill,
      theme: { color: "#7c3aed" },
      // UPI first: on a phone Checkout then lists the installed UPI apps (PhonePe, Google Pay, Paytm,
      // ...) and opens the chosen one (UPI Intent); on desktop it shows a QR code. Cards, netbanking
      // and wallets stay available below.
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
          // Closing the window is a hint, not a result: the backend decides what it means
          // (and checks with Razorpay in case a payment is still on its way).
          onPhase?.("verifying");
          try {
            const { ok, data } = await postJson(request, `/api/payments/razorpay/${order.orderId}/client-event`, { type: "DISMISSED" });
            finish(ok ? data : await fallbackStatus());
          } catch {
            finish(await fallbackStatus());
          }
        },
      },
      handler: async (response) => {
        onPhase?.("verifying");
        try {
          const { ok, data, status } = await postJson(request, "/api/payments/razorpay/verify", {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          if (ok) return finish(data);
          if (status === 400) {
            finish({ state: "FAILED", message: "We could not verify this payment. If money was deducted it will be returned automatically.", orderId: order.orderId });
            return;
          }
          finish(await fallbackStatus());
        } catch {
          // Network dropped after paying: the money may have moved. Ask the backend, which
          // reconciles with Razorpay; never report failure or success from here.
          finish(await fallbackStatus());
        }
      },
    });

    checkout.on("payment.failed", (response) => {
      // Checkout lets the customer retry inside the same window, so this is not the end.
      // Tell the backend (which re-reads the payment from Razorpay) and keep the window open.
      void postJson(request, `/api/payments/razorpay/${order.orderId}/client-event`, {
        type: "FAILED",
        paymentId: response?.error?.metadata?.payment_id,
        error: { code: response?.error?.code },
      }).catch(() => undefined);
    });

    // Coming back from a UPI app (mobile browsers often freeze the page meanwhile): ask the backend
    // right away instead of waiting for Checkout's own poll. Only a CONFIRMED result closes Checkout;
    // anything else leaves it open so the customer can still finish or retry.
    const onVisible = async () => {
      if (document.visibilityState !== "visible" || finished) return;
      try {
        const status = await fetchPaymentStatus(request, order.orderId);
        if (status.state === "CONFIRMED" && !finished) {
          try {
            checkout.close();
          } catch {
            /* already closed */
          }
          finish(status);
        }
      } catch {
        /* transient: Checkout's own handler or the status poll will settle it */
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    stopWatching = () => document.removeEventListener("visibilitychange", onVisible);

    try {
      checkout.open();
      onPhase?.("checkout");
      void postJson(request, `/api/payments/razorpay/${order.orderId}/opened`, {}).catch(() => undefined);
    } catch {
      finish({ state: "FAILED", message: "Could not open the payment window. Please try again.", orderId: order.orderId });
    }
  });
}
