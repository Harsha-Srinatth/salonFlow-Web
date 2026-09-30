import { io } from "socket.io-client";
import { decryptPayloadEnvelope, encryptPayloadEnvelope, isPayloadEncryptionEnabled } from "@/lib/security/payload-envelope";

const socketRefs = new Map();
const connectionRefCounts = new Map();
const notificationListenerRegistries = new Map();
const queueListenerRegistries = new Map();

function getNotificationRegistry(key) {
  if (!notificationListenerRegistries.has(key)) notificationListenerRegistries.set(key, new Set());
  return notificationListenerRegistries.get(key);
}

// Same reason as the notification registry: a portal's socket is shared by
// everything mounted in it, and whichever component connects first is the only
// one whose handlers get attached at creation time. Queue listeners therefore
// live in a registry the single `queue.snapshot.v1` handler fans out to.
function getQueueRegistry(key) {
  if (!queueListenerRegistries.has(key)) queueListenerRegistries.set(key, new Set());
  return queueListenerRegistries.get(key);
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

async function connectBookingsSocket({
  token,
  onConnect,
  onDisconnect,
  onBookingUpdated,
  onServiceCatalogUpdated,
  onPaymentUpdated,
  onOfferUpdated,
  onNotificationCreated,
  onQueueSnapshot,
  room = "bookings:global",
  key = "default",
}) {
  retainConnection(key);
  if (onNotificationCreated) getNotificationRegistry(key).add(onNotificationCreated);
  if (onQueueSnapshot) getQueueRegistry(key).add(onQueueSnapshot);
  const existingSocket = socketRefs.get(key);
  if (existingSocket?.connected) return existingSocket;
  const socket = io(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080", {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: {
      token: token ? `Bearer ${token}` : undefined,
    },
    withCredentials: true,
  });

  socket.on("connect", async () => {
    onConnect?.();
    if (isPayloadEncryptionEnabled()) {
      const encrypted = await encryptPayloadEnvelope({ room });
      socket.emit("booking.subscribe.v1", { encrypted });
    } else {
      socket.emit("booking.subscribe.v1", { room });
    }
  });
  // Callers that only care about one event (e.g. the notification bell) pass no
  // disconnect handler; registering `undefined` makes socket.io throw when the
  // transport drops, so the call is forwarded through an optional invocation.
  socket.on("disconnect", (...args) => onDisconnect?.(...args));
  socket.on("booking.updated.v1", async payload => {
    if (payload?.encrypted && isPayloadEncryptionEnabled()) {
      const decrypted = await decryptPayloadEnvelope(payload.encrypted).catch(() => null);
      if (decrypted) onBookingUpdated?.(decrypted);
      return;
    }
    onBookingUpdated?.(payload);
  });
  socket.on("service.catalog.updated.v1", async payload => {
    if (payload?.encrypted && isPayloadEncryptionEnabled()) {
      const decrypted = await decryptPayloadEnvelope(payload.encrypted).catch(() => null);
      if (decrypted) onServiceCatalogUpdated?.(decrypted);
      return;
    }
    onServiceCatalogUpdated?.(payload);
  });
  socket.on("payment.updated.v1", async payload => {
    if (payload?.encrypted && isPayloadEncryptionEnabled()) {
      const decrypted = await decryptPayloadEnvelope(payload.encrypted).catch(() => null);
      if (decrypted) onPaymentUpdated?.(decrypted);
      return;
    }
    onPaymentUpdated?.(payload);
  });
  socket.on("offers.updated.v1", async payload => {
    if (payload?.encrypted && isPayloadEncryptionEnabled()) {
      const decrypted = await decryptPayloadEnvelope(payload.encrypted).catch(() => null);
      if (decrypted) onOfferUpdated?.(decrypted);
      return;
    }
    onOfferUpdated?.(payload);
  });
  socket.on("notification.created.v1", async payload => {
    let decoded = payload;
    if (payload?.encrypted && isPayloadEncryptionEnabled()) {
      decoded = await decryptPayloadEnvelope(payload.encrypted).catch(() => null);
    }
    if (!decoded) return;
    for (const callback of getNotificationRegistry(key)) callback(decoded);
  });
  socket.on("queue.snapshot.v1", async payload => {
    let decoded = payload;
    if (payload?.encrypted && isPayloadEncryptionEnabled()) {
      decoded = await decryptPayloadEnvelope(payload.encrypted).catch(() => null);
    }
    if (!decoded) return;
    for (const callback of getQueueRegistry(key)) callback(decoded);
  });
  socketRefs.set(key, socket);
  return socket;
}

export async function connectAdminBookingsSocket({ token, onConnect, onDisconnect, onBookingUpdated, onServiceCatalogUpdated, onPaymentUpdated, onOfferUpdated, onNotificationCreated, onQueueSnapshot }) {
  return connectBookingsSocket({
    token,
    onConnect,
    onDisconnect,
    onBookingUpdated,
    onServiceCatalogUpdated,
    onPaymentUpdated,
    onOfferUpdated,
    onNotificationCreated,
    onQueueSnapshot,
    room: "admin:bookings",
    key: "admin",
  });
}

export async function connectReceptionBookingsSocket({ token, onConnect, onDisconnect, onBookingUpdated, onServiceCatalogUpdated, onPaymentUpdated, onOfferUpdated, onNotificationCreated, onQueueSnapshot }) {
  return connectBookingsSocket({
    token,
    onConnect,
    onDisconnect,
    onBookingUpdated,
    onServiceCatalogUpdated,
    onPaymentUpdated,
    onOfferUpdated,
    onNotificationCreated,
    onQueueSnapshot,
    room: "reception:bookings",
    key: "reception",
  });
}

export async function connectCustomerBookingsSocket({ token, onConnect, onDisconnect, onBookingUpdated, onServiceCatalogUpdated, onPaymentUpdated, onOfferUpdated, onNotificationCreated, onQueueSnapshot }) {
  return connectBookingsSocket({
    token,
    onConnect,
    onDisconnect,
    onBookingUpdated,
    onServiceCatalogUpdated,
    onPaymentUpdated,
    onOfferUpdated,
    onNotificationCreated,
    onQueueSnapshot,
    room: "bookings:global",
    key: "customer",
  });
}

export async function connectStaffBookingsSocket({ token, onConnect, onDisconnect, onBookingUpdated, onServiceCatalogUpdated, onPaymentUpdated, onOfferUpdated, onNotificationCreated, onQueueSnapshot }) {
  return connectBookingsSocket({
    token,
    onConnect,
    onDisconnect,
    onBookingUpdated,
    onServiceCatalogUpdated,
    onPaymentUpdated,
    onOfferUpdated,
    onNotificationCreated,
    onQueueSnapshot,
    room: "staff:bookings",
    key: "staff",
  });
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
  queueListenerRegistries.get(portalKey)?.delete(callback);
}

function disconnectByKey(key) {
  if (!releaseConnection(key)) return;
  const socket = socketRefs.get(key);
  notificationListenerRegistries.delete(key);
  queueListenerRegistries.delete(key);
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
