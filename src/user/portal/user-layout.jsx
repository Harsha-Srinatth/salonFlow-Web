"use client";
import { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { PortalShell } from "@/components/kit";
import { cn } from "@/lib/utils";
import { usePortalClass } from "@/lib/use-portal-class";
import { SignOutButton } from "./user-frame";
import { useUserFrame } from "./user-frame-context";
import { USER_NAV, USER_TABS } from "./user-nav";

const WIDTHS = { md: "max-w-2xl", lg: "max-w-4xl" };

/**
 * Page wrapper. Inside the persistent `UserFrame` it reports the page title and portals `actions`
 * into the shell's top bar; outside it (the auth / chunk-loading fallback in App.jsx) it renders a
 * complete shell so the chrome is on screen while the session resolves.
 * `width` centres the content in a narrower column (profile, bookings, rewards).
 */
export function UserLayout({ pageTitle, subtitle, actions, children, width }) {
  const frame = useUserFrame();

  useLayoutEffect(() => {
    frame?.setMeta({ title: pageTitle ?? "", subtitle: subtitle ?? "" });
  }, [frame, pageTitle, subtitle]);

  const body = <div className={cn("mx-auto w-full", WIDTHS[width])}>{children}</div>;
  if (frame) {
    return (
      <>
        {actions && frame.actionsSlot ? createPortal(actions, frame.actionsSlot) : null}
        {body}
      </>
    );
  }
  return <StandaloneShell title={pageTitle} actions={actions}>{body}</StandaloneShell>;
}

function StandaloneShell({ title, actions, children }) {
  usePortalClass();
  const { appUser, logout } = useAuth();
  return (
    <PortalShell
      brand={{ name: "Sahasra", tagline: "Your salon" }}
      nav={USER_NAV}
      tabs={USER_TABS}
      title={title}
      actions={actions}
      user={appUser ? { name: appUser.name ?? "Guest", role: appUser.email } : undefined}
      userMenu={<SignOutButton onSignOut={() => void logout()} />}
    >
      {children}
    </PortalShell>
  );
}
