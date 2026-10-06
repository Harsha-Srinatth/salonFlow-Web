"use client";
import { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { AdminShell } from "./admin-shell";
import { AdminRealtimeBridge } from "./admin-realtime-bridge";
import { useAdminFrame } from "./admin-frame-context";

/**
 * Page wrapper. Inside the persistent `AdminFrame` it only reports the page title and portals the
 * page's header actions into the frame's header; outside it (the auth/chunk loading fallback) it
 * renders a complete shell so the chrome is still on screen.
 */
export function AdminLayout({ pageTitle, description, actions, children }) {
  const frame = useAdminFrame();

  useLayoutEffect(() => {
    frame?.setMeta({ title: pageTitle ?? "", description: description ?? "" });
  }, [frame, pageTitle, description]);

  if (!frame) {
    return (
      <AdminShell pageTitle={pageTitle} description={description} actions={actions}>
        <AdminRealtimeBridge />
        {children}
      </AdminShell>
    );
  }

  return (
    <>
      {actions && frame.slots.desktop ? createPortal(actions, frame.slots.desktop) : null}
      {actions && frame.slots.mobile ? createPortal(actions, frame.slots.mobile) : null}
      {children}
    </>
  );
}
