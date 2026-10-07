"use client";
import { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { AdminShell } from "./admin-shell";
import { AdminRealtimeBridge } from "./admin-realtime-bridge";
import { useAdminFrame } from "./admin-frame-context";

/**
 * Page wrapper. Inside the persistent `AdminFrame` it reports the page title and portals the page's
 * header actions into the top bar (≥640px); on phones the same actions render as a row above the
 * page content, where they have room. Outside the frame (the auth/chunk loading fallback) it renders
 * a complete shell so the chrome is still on screen.
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
      {actions && frame.slot ? createPortal(actions, frame.slot) : null}
      {actions ? <div className="mb-4 flex flex-wrap items-center justify-end gap-2 sm:hidden">{actions}</div> : null}
      {children}
    </>
  );
}
