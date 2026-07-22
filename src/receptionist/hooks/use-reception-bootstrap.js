"use client";

import {
  connectReceptionRealtime,
  disconnectReceptionRealtime,
  fetchReceptionBookings,
  fetchReceptionQueue,
  fetchReceptionServices,
  fetchReceptionStylists,
} from "@/store/reception-bookings-slice";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

let bootstrapRefCount = 0;

export function useReceptionBootstrap({ enabled = true } = {}) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!enabled) return;

    bootstrapRefCount += 1;
    if (bootstrapRefCount === 1) {
      void dispatch(fetchReceptionBookings());
      void dispatch(fetchReceptionQueue());
      void dispatch(fetchReceptionStylists());
      void dispatch(fetchReceptionServices());
      void dispatch(connectReceptionRealtime());
    }

    return () => {
      bootstrapRefCount = Math.max(0, bootstrapRefCount - 1);
      if (bootstrapRefCount === 0) {
        void dispatch(disconnectReceptionRealtime());
      }
    };
  }, [dispatch, enabled]);
}
