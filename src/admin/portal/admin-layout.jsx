"use client";
import { PortalShell } from "@/components/shared/portal-shell";
import { adminNavItems } from "./nav-config";
import { AdminRealtimeBridge } from "./admin-realtime-bridge";
export function AdminLayout({ pageTitle, actions, children }) {
    return (<PortalShell portalName="Sahasra Admin" pageTitle={pageTitle} navItems={adminNavItems} actions={actions}>
      <AdminRealtimeBridge />
      {children}
    </PortalShell>);
}
