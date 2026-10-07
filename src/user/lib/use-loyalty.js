import { useCallback, useEffect, useSyncExternalStore } from "react";
import { buildReferralLink } from "@/lib/referral";
import { fetchLoyaltyOverview } from "./user-api";

/**
 * One shared copy of GET /api/customer/loyalty for the whole customer session: home, the booking
 * success screen and Wallet & rewards read the same snapshot, so moving between them never refetches
 * more than once every STALE_MS (an explicit reload() always does).
 */
const STALE_MS = 30_000;
let snapshot = { data: null, error: null, loading: false, loadedAt: 0 };
let inflight = null;
const listeners = new Set();

function set(next) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((fn) => fn());
}

export function loadLoyalty({ force = false } = {}) {
  if (inflight) return inflight;
  if (!force && snapshot.data && Date.now() - snapshot.loadedAt < STALE_MS) return Promise.resolve(snapshot.data);
  set({ loading: true });
  inflight = fetchLoyaltyOverview()
    .then((data) => {
      set({ data, error: null, loading: false, loadedAt: Date.now() });
      return data;
    })
    .catch((error) => {
      set({ error, loading: false });
      throw error;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Forget the cached snapshot (sign-out on a shared device). */
export function resetLoyalty() {
  snapshot = { data: null, error: null, loading: false, loadedAt: 0 };
  listeners.forEach((fn) => fn());
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getSnapshot = () => snapshot;

export function useLoyalty({ enabled = true } = {}) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (enabled) loadLoyalty().catch(() => undefined);
  }, [enabled]);
  const reload = useCallback(() => loadLoyalty({ force: true }), []);
  const code = state.data?.referralCode ?? "";
  return {
    overview: state.data,
    loading: state.loading && !state.data,
    error: state.data ? null : state.error,
    reload,
    referralCode: code,
    referralLink: buildReferralLink(code),
  };
}
