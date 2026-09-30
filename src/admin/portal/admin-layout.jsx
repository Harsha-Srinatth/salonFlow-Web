"use client";
import { AdminShell } from "./admin-shell";
import { AdminRealtimeBridge } from "./admin-realtime-bridge";
export function AdminLayout({ pageTitle, description, actions, children }) {
    return (<AdminShell pageTitle={pageTitle} description={description} actions={actions}>
      <AdminRealtimeBridge />
      {children}
    </AdminShell>);
}
