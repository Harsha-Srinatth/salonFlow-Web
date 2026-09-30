"use client";

import { Button } from "@/components/ui/button";
import { useAppThemeToggle } from "@/components/theme-provider";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ProfileCompletionPrompts } from "@/components/shared/profile-completion-prompts";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Crown,
  Gift,
  History,
  Hourglass,
  LayoutDashboard,
  Menu,
  Moon,
  Sun,
  Tag,
  UserCircle,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

const userNavItems = [
  { label: "Dashboard", href: "/user-dashboard", icon: LayoutDashboard },
  { label: "My Appointments", href: "/user-dashboard/appointments", icon: Calendar },
  { label: "Live Queue", href: "/user-dashboard/queue", icon: Hourglass },
  { label: "Offers", href: "/user-dashboard/offers", icon: Tag },
  { label: "Membership", href: "/user-dashboard/membership", icon: Crown },
  { label: "Refer & Earn", href: "/user-dashboard/loyalty", icon: Gift },
  { label: "Booking History", href: "/user-dashboard/booking-history", icon: History },
  { label: "Profile", href: "/user-dashboard/profile", icon: UserCircle },
];

function useActiveHref(pathname, navItems) {
  return useMemo(() => {
    const normalize = (href) => href.split("#")[0];
    const sorted = [...navItems].sort((a, b) => normalize(b.href).length - normalize(a.href).length);
    const exact = sorted.find((item) => pathname === normalize(item.href));
    if (exact) return exact.href;
    const prefix = sorted.find((item) => {
      const base = normalize(item.href);
      return base !== "/" && pathname.startsWith(`${base}/`);
    });
    return prefix?.href ?? navItems[0]?.href;
  }, [navItems, pathname]);
}

export function UserLayout({ pageTitle, actions, children }) {
  const { pathname } = useLocation();
  const { theme, toggleTheme } = useAppThemeToggle();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeHref = useActiveHref(pathname, userNavItems);

  const navLinkClass = (href) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      activeHref === href
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Toggle menu"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{pageTitle}</h1>
          <NotificationBell portal="customer" />
          <Button type="button" variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
        </div>
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex h-[calc(100vh-57px)] lg:h-screen">
        {/* Sidebar: translate only on mobile (max-lg) so tailwind-merge does not drop lg overrides */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border bg-card transition-transform duration-300 max-lg:top-[57px]",
            "lg:static lg:translate-x-0",
            sidebarOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border px-6 py-6">
              <Link to="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
                <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 font-bold text-primary-foreground">
                  S
                </div>
                <div>
                  <p className="font-bold">Sahasra</p>
                  <p className="text-xs text-muted-foreground">Customer</p>
                </div>
              </Link>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-6">
              {userNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={navLinkClass(item.href)}
                  >
                    <Icon className="size-5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="shrink-0 border-t border-border p-3">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="sticky top-0 z-20 hidden shrink-0 items-center justify-between border-b border-border bg-card/95 px-8 py-4 backdrop-blur-sm lg:flex">
            <h1 className="text-xl font-bold">{pageTitle}</h1>
            <div className="flex items-center gap-2">
              <NotificationBell portal="customer" />
              <Button type="button" variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>
              {actions}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
          </div>
        </main>
      </div>

      {/* Asks for gender, then date of birth — each only while that field is
          still empty on the account. Lives in the layout so it covers every
          customer page rather than just the dashboard. */}
      <ProfileCompletionPrompts />
    </div>
  );
}
