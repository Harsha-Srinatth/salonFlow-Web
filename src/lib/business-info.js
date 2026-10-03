import { apiJson } from "@/lib/api-json";
import { useEffect, useState } from "react";

/**
 * Public business profile (contact details, address, social links, hours, policies) as entered
 * by the admin in Settings. One request per page load, shared by every component that asks.
 */
let cached = null;
let inflight = null;

export function fetchBusinessInfo() {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = apiJson("/api/public/business", { timeoutMs: 15_000 })
      .then((data) => {
        cached = data;
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** @returns {{ info: object | null, status: "loading" | "ready" | "error" }} */
export function useBusinessInfo() {
  const [state, setState] = useState(() => (cached ? { info: cached, status: "ready" } : { info: null, status: "loading" }));
  useEffect(() => {
    if (cached) return undefined;
    let alive = true;
    fetchBusinessInfo()
      .then((info) => alive && setState({ info, status: "ready" }))
      .catch(() => alive && setState({ info: null, status: "error" }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export function formatAddress(profile) {
  if (!profile) return "";
  return [profile.addressLine1, profile.addressLine2, profile.city, profile.state, profile.postalCode, profile.country].filter(Boolean).join(", ");
}

/** `tel:` link from a display phone number. */
export function telHref(phone) {
  return `tel:${`${phone ?? ""}`.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(phone) {
  return `https://wa.me/${`${phone ?? ""}`.replace(/\D/g, "")}`;
}
