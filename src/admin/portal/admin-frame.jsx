"use client";
import { Suspense, useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { LoadingOrb } from "@/components/shared/loading-orb";
import { AdminShell } from "./admin-shell";
import { AdminRealtimeBridge } from "./admin-realtime-bridge";
import { AdminFrameContext } from "./admin-frame-context";

/** Route layout for every admin page: one shell for the whole session, pages swap inside it. */
export function AdminFrame() {
  const [meta, setMetaState] = useState({ title: "", description: "" });
  const [desktopSlot, setDesktopSlot] = useState(null);
  const [mobileSlot, setMobileSlot] = useState(null);

  const value = useMemo(
    () => ({
      // Bail out when nothing changed so a page re-rendering never re-renders the whole shell.
      setMeta: (next) => setMetaState((current) => (current.title === next.title && current.description === next.description ? current : next)),
      slots: { desktop: desktopSlot, mobile: mobileSlot },
    }),
    [desktopSlot, mobileSlot]
  );

  return (
    <AdminFrameContext.Provider value={value}>
      <AdminShell pageTitle={meta.title} description={meta.description} slotRefs={{ desktop: setDesktopSlot, mobile: setMobileSlot }}>
        <AdminRealtimeBridge />
        <Suspense fallback={<LoadingOrb />}>
          <Outlet />
        </Suspense>
      </AdminShell>
    </AdminFrameContext.Provider>
  );
}
