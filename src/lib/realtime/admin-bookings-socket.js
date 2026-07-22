import { io } from "socket.io-client";
import { decryptPayloadEnvelope, encryptPayloadEnvelope, isPayloadEncryptionEnabled } from "@/lib/security/payload-envelope";

const socketRefs = new Map();
const connectionRefCounts = new Map();

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
  room = "bookings:global",
  key = "default",
}) {
  retainConnection(key);
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
  socket.on("disconnect", onDisconnect);
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
  socketRefs.set(key, socket);
  return socket;
}

export async function connectAdminBookingsSocket({ token, onConnect, onDisconnect, onBookingUpdated, onServiceCatalogUpdated, onPaymentUpdated, onOfferUpdated }) {
  return connectBookingsSocket({
    token,
    onConnect,
    onDisconnect,
    onBookingUpdated,
    onServiceCatalogUpdated,
    onPaymentUpdated,
    onOfferUpdated,
    room: "admin:bookings",
    key: "admin",
  });
}

export async function connectReceptionBookingsSocket({ token, onConnect, onDisconnect, onBookingUpdated, onServiceCatalogUpdated, onPaymentUpdated, onOfferUpdated }) {
  return connectBookingsSocket({
    token,
    onConnect,
    onDisconnect,
    onBookingUpdated,
    onServiceCatalogUpdated,
    onPaymentUpdated,
    onOfferUpdated,
    room: "reception:bookings",
    key: "reception",
  });
}

export async function connectCustomerBookingsSocket({ token, onConnect, onDisconnect, onBookingUpdated, onServiceCatalogUpdated, onPaymentUpdated, onOfferUpdated }) {
  return connectBookingsSocket({
    token,
    onConnect,
    onDisconnect,
    onBookingUpdated,
    onServiceCatalogUpdated,
    onPaymentUpdated,
    onOfferUpdated,
    room: "bookings:global",
    key: "customer",
  });
}

export async function connectStaffBookingsSocket({ token, onConnect, onDisconnect, onBookingUpdated, onServiceCatalogUpdated, onPaymentUpdated, onOfferUpdated }) {
  return connectBookingsSocket({
    token,
    onConnect,
    onDisconnect,
    onBookingUpdated,
    onServiceCatalogUpdated,
    onPaymentUpdated,
    onOfferUpdated,
    room: "staff:bookings",
    key: "staff",
  });
}

function disconnectByKey(key) {
  if (!releaseConnection(key)) return;
  const socket = socketRefs.get(key);
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
