"use client";
import { LogOut, Moon, Share2, Sun } from "lucide-react";
import { Suspense, useCallback, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { useAppThemeToggle } from "@/components/theme-provider";
import { SupportAssistant } from "@/components/assistant/support-assistant";
import { ProfileCompletionPrompts } from "@/components/shared/profile-completion-prompts";
import { BrandLoader, InviteSheet, PortalShell } from "@/components/kit";
import { usePortalClass } from "@/lib/use-portal-class";
import { useLoyalty, resetLoyalty } from "../lib/use-loyalty";
import { NotificationCenter, useCustomerNotifications } from "./customer-notifications";
import { UserFrameContext } from "./user-frame-context";
import { USER_NAV, USER_TABS } from "./user-nav";

const brand = { name: "Sahasra", tagline: "Your salon" };

export function SignOutButton({ onSignOut }) {
  return (
    <button
      type="button"
      onClick={onSignOut}
      className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-ink-destructive transition-colors hover:bg-destructive/10"
    >
      <LogOut className="size-[18px]" aria-hidden /> Sign out
    </button>
  );
}

/** Shared top-bar actions: page actions slot, assistant, notifications. */
function TopActions({ setSlot, notifications, isCustomer }) {
  return (
    <>
      <span ref={setSlot} className="flex items-center gap-1 empty:hidden" />
      <SupportAssistant variant="portal" isCustomer={isCustomer} />
      <NotificationCenter state={notifications} />
    </>
  );
}

/**
 * Route layout for every customer page: one PortalShell for the whole session (the sidebar pill and
 * bottom tabs animate between pages instead of remounting), plus the shared notification center,
 * support assistant and invite sheet. Pages report their title through `UserLayout`.
 */
export function UserFrame() {
  usePortalClass();
  const { appUser, logout } = useAuth();
  const { isDark, toggleTheme } = useAppThemeToggle();
  const navigate = useNavigate();
  const [meta, setMetaState] = useState({ title: "", subtitle: "" });
  const [slot, setSlot] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const isCustomer = appUser?.role === "USER";
  const notifications = useCustomerNotifications(isCustomer ? appUser?.id : null);
  const { referralLink, referralCode } = useLoyalty({ enabled: isCustomer });

  const signOut = useCallback(() => {
    resetLoyalty();
    void logout();
  }, [logout]);
  const openInvite = useCallback(() => setInviteOpen(true), []);

  const value = useMemo(
    () => ({
      setMeta: (next) => setMetaState((cur) => (cur.title === next.title && cur.subtitle === next.subtitle ? cur : next)),
      actionsSlot: slot,
      openInvite,
    }),
    [slot, openInvite]
  );

  const commands = useMemo(
    () => [
      { heading: "Go to", items: USER_NAV.map((item) => ({ id: item.href, label: item.label, icon: item.icon, onSelect: () => navigate(item.href) })) },
      {
        heading: "Actions",
        items: [
          { id: "invite", label: "Invite a friend", icon: Share2, keywords: ["refer", "share"], onSelect: openInvite },
          { id: "theme", label: isDark ? "Light mode" : "Dark mode", icon: isDark ? Sun : Moon, onSelect: toggleTheme },
        ],
      },
    ],
    [navigate, openInvite, isDark, toggleTheme]
  );

  return (
    <UserFrameContext.Provider value={value}>
      <PortalShell
        brand={brand}
        nav={USER_NAV}
        tabs={USER_TABS}
        title={meta.title}
        subtitle={meta.subtitle}
        user={appUser ? { name: appUser.name ?? "Guest", role: appUser.email } : undefined}
        userMenu={<SignOutButton onSignOut={signOut} />}
        commands={commands}
        actions={<TopActions setSlot={setSlot} notifications={notifications} isCustomer={isCustomer} />}
      >
        <Suspense fallback={<BrandLoader className="py-24" label="Loading" />}>
          <Outlet />
        </Suspense>
      </PortalShell>
      {referralLink ? <InviteSheet open={inviteOpen} onOpenChange={setInviteOpen} link={referralLink} code={referralCode} /> : null}
      {/* Asks for gender, then date of birth, each only while that field is still empty. */}
      <ProfileCompletionPrompts />
    </UserFrameContext.Provider>
  );
}
