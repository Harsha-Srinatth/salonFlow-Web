import { createAsyncThunk } from "@reduxjs/toolkit";

/**
 * createAsyncThunk whose concurrent dispatches share one request. Several components often load
 * the same list at once (the shell and the page, two widgets on one page); a second dispatch
 * while the first is in flight gets the same promise back (so `.unwrap()` and
 * `thunk.rejected.match(result)` behave exactly as before). Nothing is cached beyond the request
 * itself: a dispatch after it settles always fetches fresh data.
 * `keyOf(arg)` distinguishes requests with different arguments (default: one per thunk).
 */
export function createDedupedThunk(type, payloadCreator, keyOf = () => "") {
  const inner = createAsyncThunk(type, payloadCreator);
  const inFlight = new Map();
  const thunk = (arg) => (dispatch) => {
    const key = keyOf(arg);
    const existing = inFlight.get(key);
    if (existing) return existing;
    const promise = dispatch(inner(arg));
    inFlight.set(key, promise);
    const clear = () => inFlight.delete(key);
    promise.then(clear, clear);
    return promise;
  };
  return Object.assign(thunk, {
    pending: inner.pending,
    fulfilled: inner.fulfilled,
    rejected: inner.rejected,
    settled: inner.settled,
    typePrefix: inner.typePrefix,
  });
}
