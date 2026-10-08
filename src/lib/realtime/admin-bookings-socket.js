import { getFirebaseIdToken } from "@/lib/auth/id-token";
import { decryptPayloadEnvelope, encryptPayloadEnvelope, isPayloadEncryptionEnabled } from "@/lib/security/payload-envelope";

/**
 * One socket per portal key ("admin" | "reception" | "customer" | "staff"), shared by every
 * component mounted in that portal.
 *
 * Every consumer registers its own callbacks in a per-key registry and the single socket
 * fans each event out to all of them. Previously only the *first* caller's booking/payment/
 * service/offer handlers were ever attached (later callers got the existing socket back and
 * their handlers were silently dropped), and a caller arriving while the socket was still
 * connecting created a second, untracked socket.
 */

const socketRefs = new Map();
const connectionRefCounts = new Map();
/** key -> Map(callbackName -> Set<callback>) */
const listenerRegistries = new Map();
/** `${key}:${owner}` -> the callbacks that owner registered last (replaced on its next connect). */
const ownerCallbacks = new Map();

/** Server event name -> the callback option that consumes it. */
const EVENT_CALLBACKS = [
  ["booking.updated.v1", "onBookingUpdated"],
  ["service.catalog.updated.v1", "onServiceCatalogUpdated"],
  ["payment.updated.v1", "onPaymentUpdated"],
  ["offers.updated.v1", "onOfferUpdated"],
  ["notification.created.v1", "onNotificationCreated"],
  ["queue.snapshot.v1", "onQueueSnapshot"],
];
const LIFECYCLE_CALLBACKS = ["onConnect", "onDisconnect"];

function getRegistry(key) {
  if (!listenerRegistries.has(key)) listenerRegistries.set(key, new Map());
  return listenerRegistries.get(key);
}

function addCallback(key, name, callback) {
  if (typeof callback !== "function") return;
  const registry = getRegistry(key);
  if (!registry.has(name)) registry.set(name, new Set());
  registry.get(name).add(callback);
}

function emitToCallbacks(key, name, ...args) {
  const callbacks = listenerRegistries.get(key)?.get(name);
  if (!callbacks) return;
  for (const callback of [...callbacks]) {
    try {
      callback(...args);
    } catch (error) {
      console.error(`socket ${name} listener failed`, error);
    }
  }
}

function retainConnection(key) {
  connectionRefCounts.set(key, (connectionRefCounts.get(key) ?? 0) + 1);
}

function releaseConnection(key) {
  const next = (connectionRefCounts.get(key) ?? 1) - 1;
  if (next > 0) {
    connectionRefCounts.set(key, next);
    return false;
  }
  connectionRefCounts.delete(key);
  return true;
}

async function decodePayload(payload) {
  if (payload?.encrypted && isPayloadEncryptionEnabled()) {
    return decryptPayloadEnvelope(payload.encrypted).catch(() => null);
  }
  return payload;
}

function createSocket(io, key, initialToken, room) {
  const socket = io(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080", {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    // A function, so every (re)connection attempt authenticates with the *current* token.
    // A fixed value expires after an hour and every later reconnect was then refused.
    // Staff and reception have no Firebase user: they authenticate with their cookie.
    auth: async (callback) => {
      const fresh = await getFirebaseIdToken().catch(() => null);
      const token = fresh ?? initialToken;
      callback({ token: token ? `Bearer ${token}` : undefined });
    },
    withCredentials: true,
  });

  let hasConnected = false;
  socket.on("connect", async () => {
    // `reconnect` lets consumers refetch only after a drop (to catch missed events); the first
    // connect follows the page's own initial fetch, so refetching then just doubles the load.
    emitToCallbacks(key, "onConnect", { reconnect: hasConnected });
    hasConnected = true;
    // Kept for older servers that still honour a client-chosen room; current servers
    // assign rooms from the authenticated identity and ignore this.
    if (isPayloadEncryptionEnabled()) {
      const encrypted = await encryptPayloadEnvelope({ room });
      socket.emit("booking.subscribe.v1", { encrypted });
    } else {
      socket.emit("booking.subscribe.v1", { room });
    }
  });
  socket.on("disconnect", (...args) => emitToCallbacks(key, "onDisconnect", ...args));
  for (const [eventName, callbackName] of EVENT_CALLBACKS) {
    socket.on(eventName, async (payload) => {
      const decoded = await decodePayload(payload);
      if (decoded) emitToCallbacks(key, callbackName, decoded);
    });
  }
  return socket;
}

const CALLBACK_NAMES = [...LIFECYCLE_CALLBACKS, ...EVENT_CALLBACKS.map(([, callbackName]) => callbackName)];

/**
 * `owner` (optional) names a consumer that may connect many times while the socket stays up,
 * e.g. a Redux thunk dispatched from a page that remounts per visit. Its previous callbacks are
 * replaced instead of piling up (one more set of handlers per visit otherwise).
 */
async function connectBookingsSocket({ token, room = "bookings:global", key = "default", owner, ...callbacks }) {
  retainConnection(key);
  if (owner) {
    const ownerKey = `${key}:${owner}`;
    const previous = ownerCallbacks.get(ownerKey);
    if (previous) {
      const registry = listenerRegistries.get(key);
      for (const name of CALLBACK_NAMES) if (previous[name]) registry?.get(name)?.delete(previous[name]);
    }
    ownerCallbacks.set(ownerKey, callbacks);
  }
  for (const name of CALLBACK_NAMES) {
    addCallback(key, name, callbacks[name]);
  }
  const existing = socketRefs.get(key);
  if (existing) {
    // Reuse even while it is still loading, connecting or reconnecting; socket.io retries by
    // itself. Late joiners that missed the connect event are told right away.
    if (existing.connected) {
      try {
        callbacks.onConnect?.({ reconnect: false, lateJoin: true });
      } catch (error) {
        console.error("socket onConnect listener failed", error);
      }
    }
    return existing;
  }
  // socket.io-client is loaded on first connect, keeping it out of the entry bundle (the landing
  // page and sign-in never open a socket). Until then the registry holds the pending promise.
  const pending = import("socket.io-client").then(({ io }) => {
    const socket = createSocket(io, key, token, room);
    if (socketRefs.get(key) === pending) {
      socketRefs.set(key, socket);
    } else {
      // Every consumer left while the library was loading.
      socket.removeAllListeners();
      socket.disconnect();
    }
    return socket;
  });
  socketRefs.set(key, pending);
  return pending;
}

export async function connectAdminBookingsSocket(options) {
  return connectBookingsSocket({ ...options, room: "admin:bookings", key: "admin" });
}

export async function connectReceptionBookingsSocket(options) {
  return connectBookingsSocket({ ...options, room: "reception:bookings", key: "reception" });
}

export async function connectCustomerBookingsSocket(options) {
  return connectBookingsSocket({ ...options, room: "bookings:global", key: "customer" });
}

export async function connectStaffBookingsSocket(options) {
  return connectBookingsSocket({ ...options, room: "staff:bookings", key: "staff" });
}

/**
 * Detach a queue-snapshot listener without tearing the shared socket down.
 *
 * A portal's socket outlives any single page, so a page that unmounts must drop
 * its own callback explicitly — otherwise it keeps receiving snapshots for the
 * rest of the session.
 *
 * @param {"admin" | "reception" | "customer" | "staff"} portalKey
 * @param {(board: object) => void} callback
 */
export function removeQueueSnapshotListener(portalKey, callback) {
  listenerRegistries.get(portalKey)?.get("onQueueSnapshot")?.delete(callback);
}

function disconnectByKey(key) {
  if (!releaseConnection(key)) return;
  const socket = socketRefs.get(key);
  listenerRegistries.delete(key);
  for (const ownerKey of [...ownerCallbacks.keys()]) if (ownerKey.startsWith(`${key}:`)) ownerCallbacks.delete(ownerKey);
  socketRefs.delete(key);
  // Still loading: the pending connect sees it was dropped and closes the socket itself.
  if (!socket || typeof socket.then === "function") return;
  try {
    if (typeof socket.removeAllListeners === "function") socket.removeAllListeners();
    if (typeof socket.disconnect === "function") socket.disconnect();
    else if (typeof socket.close === "function") socket.close();
  } catch {
    // Ignore socket cleanup errors from half-open transports
  }
}

export function disconnectAdminBookingsSocket() {
  disconnectByKey("admin");
}

export function disconnectReceptionBookingsSocket() {
  disconnectByKey("reception");
}

export function disconnectCustomerBookingsSocket() {
  disconnectByKey("customer");
}

export function disconnectStaffBookingsSocket() {
  disconnectByKey("staff");
}
