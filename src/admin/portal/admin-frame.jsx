"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useLocation } from "react-router-dom";
import { BrandLoader } from "@/components/kit";
import { fetchAdminDashboardData } from "@/store/admin-dashboard-slice";
import { AdminShell } from "./admin-shell";
import { AdminRealtimeBridge } from "./admin-realtime-bridge";
import { AdminFrameContext } from "./admin-frame-context";

/**
 * Route layout for every admin page: one shell for the whole session, pages swap inside it.
 * Pages report their title through context and portal their header actions into `slot`.
 */
export function AdminFrame() {
  const [meta, setMetaState] = useState({ title: "", description: "" });
  const [slot, setSlot] = useState(null);
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const haveTeam = useSelector((state) => state.adminDashboard.staff.length > 0 || state.adminDashboard.loading);

  const value = useMemo(
    () => ({
      // Bail out when nothing changed so a page re-rendering never re-renders the whole shell.
      setMeta: (next) => setMetaState((current) => (current.title === next.title && current.description === next.description ? current : next)),
      slot,
    }),
    [slot]
  );

  // PortalShell scrolls the document, so start each page at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  // The ⌘K palette searches staff and services from the store. Most pages load them anyway; if
  // the first page doesn't, load them once when the browser is idle.
  useEffect(() => {
    if (haveTeam) return undefined;
    const timer = window.setTimeout(() => void dispatch(fetchAdminDashboardData()), 1500);
    return () => window.clearTimeout(timer);
    // Only on mount: later pages refresh the data themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminFrameContext.Provider value={value}>
      <AdminShell pageTitle={meta.title} description={meta.description} slotRef={setSlot}>
        <AdminRealtimeBridge />
        <Suspense fallback={<BrandLoader className="py-24" label="Loading…" />}>
          <Outlet />
        </Suspense>
      </AdminShell>
    </AdminFrameContext.Provider>
  );
}
