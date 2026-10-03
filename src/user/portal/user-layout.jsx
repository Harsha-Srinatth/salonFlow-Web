"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAppThemeToggle } from "@/components/theme-provider";
import { NotificationBell } from "@/components/shared/notification-bell";
import { SupportAssistant } from "@/components/assistant/support-assistant";
import { useMediaQuery } from "@/lib/use-media-query";
import { ProfileCompletionPrompts } from "@/components/shared/profile-completion-prompts";
import { cn } from "@/lib/utils";
import { usePortalClass } from "@/lib/use-portal-class";
import {
  CalendarPlus,
  Crown,
  Gift,
  History,
  Hourglass,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Moon,
  Sun,
  Tag,
  UserCircle,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";

const NAV = {
  home: { label: "Home", href: "/user-dashboard", icon: LayoutDashboard },
  book: { label: "Book", href: "/user-dashboard/appointments", icon: CalendarPlus },
  queue: { label: "Live Queue", href: "/user-dashboard/queue", icon: Hourglass },
  offers: { label: "Offers", href: "/user-dashboard/offers", icon: Tag },
  membership: { label: "Membership", href: "/user-dashboard/membership", icon: Crown },
  rewards: { label: "Refer & Earn", href: "/user-dashboard/loyalty", icon: Gift },
  history: { label: "History", href: "/user-dashboard/booking-history", icon: History },
  profile: { label: "Profile", href: "/user-dashboard/profile", icon: UserCircle },
};

// Laptop dock shows everything except Profile (that lives in the avatar menu).
const dockItems = [NAV.home, NAV.book, NAV.queue, NAV.offers, NAV.membership, NAV.rewards, NAV.history];
// Phone: four tabs around a raised centre "Book" button; the rest sit in the More sheet.
const tabLeft = [NAV.home, NAV.queue];
const tabRight = [NAV.offers];
const moreItems = [NAV.membership, NAV.rewards, NAV.history, NAV.profile];

function useActiveHref(pathname) {
  return useMemo(() => {
    const all = Object.values(NAV).sort((a, b) => b.href.length - a.href.length);
    return all.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.href ?? NAV.home.href;
  }, [pathname]);
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 pr-2" aria-label="Sahasra home">
      <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
        S
      </span>
      <span className="font-display text-lg font-bold">Sahasra</span>
    </Link>
  );
}

function UserMenu({ appUser, logout, theme, toggleTheme }) {
  const initial = `${appUser?.name ?? "S"}`.trim().charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl border-0 p-2 shadow-xl">
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="truncate text-sm font-semibold">{appUser?.name ?? "Guest"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{appUser?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="rounded-lg">
          <Link to={NAV.profile.href}>
            <UserCircle /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg" onSelect={toggleTheme}>
          {theme === "dark" ? <Sun /> : <Moon />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" className="rounded-lg" onSelect={() => void logout()}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Laptop: a floating pill dock instead of a sidebar + header bar. */
function Dock({ activeHref, appUser, logout, theme, toggleTheme, showAssistant }) {
  return (
    <header className="sticky top-4 z-40 mx-auto hidden w-full max-w-7xl px-8 lg:block">
      <div className="flex items-center gap-2 rounded-full bg-card p-2 pl-3 shadow-lg shadow-black/5">
        <Logo />
        <nav aria-label="Main" className="flex flex-1 items-center justify-center gap-1">
          {dockItems.map((item) => {
            const Icon = item.icon;
            const active = activeHref === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-transform hover:-translate-y-px",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                <span className={cn(active ? "inline" : "hidden xl:inline")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        {showAssistant ? <SupportAssistant variant="portal" isCustomer={appUser?.role === "USER"} /> : null}
        <NotificationBell portal="customer" />
        <UserMenu appUser={appUser} logout={logout} theme={theme} toggleTheme={toggleTheme} />
      </div>
    </header>
  );
}

function TabLink({ item, active }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="size-6" />
      {item.label}
    </Link>
  );
}

/** Phone: bottom tab bar with a raised Book button, plus a More sheet. */
function BottomBar({ activeHref, appUser, logout, theme, toggleTheme }) {
  const moreActive = moreItems.some((item) => item.href === activeHref);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-card px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] lg:hidden"
    >
      <div className="flex items-end">
        {tabLeft.map((item) => (
          <TabLink key={item.href} item={item} active={activeHref === item.href} />
        ))}
        <Link
          to={NAV.book.href}
          aria-label="Book an appointment"
          className="-mt-5 flex flex-1 flex-col items-center gap-1 pb-2 text-[11px] font-semibold text-primary"
        >
          <span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/20 ring-4 ring-card">
            <CalendarPlus className="size-7" />
          </span>
          Book
        </Link>
        {tabRight.map((item) => (
          <TabLink key={item.href} item={item} active={activeHref === item.href} />
        ))}
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                moreActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="size-6" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom">
            <SheetTitle className="font-display text-lg font-semibold">{appUser?.name ?? "Menu"}</SheetTitle>
            <SheetDescription className="sr-only">More places to go in your account</SheetDescription>
            <div className="grid grid-cols-2 gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SheetClose asChild key={item.href}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex min-h-14 items-center gap-3 rounded-2xl p-4 text-sm font-semibold",
                        activeHref === item.href ? "bg-primary text-primary-foreground" : "bg-secondary"
                      )}
                    >
                      <Icon className="size-5" />
                      {item.label}
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" className="h-12 rounded-2xl" onClick={toggleTheme}>
                {theme === "dark" ? <Sun /> : <Moon />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </Button>
              <Button type="button" variant="secondary" className="h-12 rounded-2xl text-destructive" onClick={() => void logout()}>
                <LogOut /> Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

const WIDTHS = { md: "max-w-2xl", lg: "max-w-4xl" };

/** `width` centres the page header and content in a narrower column (profile, history, rewards). */
export function UserLayout({ pageTitle, actions, children, width }) {
  usePortalClass();
  const { pathname } = useLocation();
  const { appUser, logout } = useAuth();
  const { theme, toggleTheme } = useAppThemeToggle();
  const activeHref = useActiveHref(pathname);
  // One assistant instance at a time (phone header or laptop dock), so its chat state isn't split.
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const menu = { appUser, logout, theme, toggleTheme };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Phone top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-background px-4 lg:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          {!isDesktop ? <SupportAssistant variant="portal" isCustomer={appUser?.role === "USER"} /> : null}
          <NotificationBell portal="customer" />
          <UserMenu {...menu} />
        </div>
      </div>

      <Dock activeHref={activeHref} {...menu} showAssistant={isDesktop} />

      <main className="mx-auto w-full max-w-7xl px-4 pb-32 pt-2 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
        <div className={cn("mx-auto w-full", WIDTHS[width])}>
        {pageTitle || actions ? (
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{pageTitle}</h1>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
        {children}
        </div>
      </main>

      <BottomBar activeHref={activeHref} {...menu} />

      {/* Asks for gender, then date of birth — each only while that field is
          still empty on the account. Lives in the layout so it covers every
          customer page rather than just the dashboard. */}
      <ProfileCompletionPrompts />
    </div>
  );
}
