import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";

async function notificationsFetch(path, init) {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function fetchNotifications({ limit = 30, unreadOnly = false } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (unreadOnly) params.set("unreadOnly", "true");
  const data = await notificationsFetch(`/api/notifications?${params.toString()}`);
  return data.notifications ?? [];
}

export async function fetchUnreadNotificationCount() {
  const data = await notificationsFetch("/api/notifications/unread-count");
  return Number(data.count ?? 0);
}

export async function markNotificationRead(notificationId) {
  const data = await notificationsFetch(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
  return data.notification;
}

export async function markAllNotificationsRead() {
  return notificationsFetch("/api/notifications/read-all", { method: "POST" });
}
