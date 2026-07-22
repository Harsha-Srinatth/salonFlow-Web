"use client";
import { connectAdminRealtime, disconnectAdminRealtime } from "@/store/admin-portal-slice";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

export function AdminRealtimeBridge() {
  const dispatch = useDispatch();
  useEffect(() => {
    void dispatch(connectAdminRealtime());
    return () => {
      void dispatch(disconnectAdminRealtime());
    };
  }, [dispatch]);
  return null;
}
