import { io } from "socket.io-client";
import { getFirebaseIdToken } from "@/lib/auth/auth-client";
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

function createSocket(key, initialToken, room) {
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

  socket.on("connect", async () => {
    emitToCallbacks(key, "onConnect");
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

async function connectBookingsSocket({ token, room = "bookings:global", key = "default", ...callbacks }) {
  retainConnection(key);
  for (const name of [...LIFECYCLE_CALLBACKS, ...EVENT_CALLBACKS.map(([, callbackName]) => callbackName)]) {
    addCallback(key, name, callbacks[name]);
  }
  const existing = socketRefs.get(key);
  if (existing) {
    // Reuse even while it is still connecting or reconnecting; socket.io retries by itself.
    // Late joiners that missed the connect event are told right away.
    if (existing.connected) {
      try {
        callbacks.onConnect?.();
      } catch (error) {
        console.error("socket onConnect listener failed", error);
      }
    }
    return existing;
  }
  const socket = createSocket(key, token, room);
  socketRefs.set(key, socket);
  return socket;
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
  if (!socket) return;
  try {
    if (typeof socket.removeAllListeners === "function") socket.removeAllListeners();
    if (typeof socket.disconnect === "function") socket.disconnect();
    else if (typeof socket.close === "function") socket.close();
  } catch {
    // Ignore socket cleanup errors from half-open transports
  }
  socketRefs.delete(key);
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
