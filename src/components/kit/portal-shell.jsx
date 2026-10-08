import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Menu as MenuIcon, Moon, Search, Sun, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAppThemeToggle } from "@/components/theme-provider";
import { haptic, spring } from "@/components/motion/presets";
import { PageTransition } from "@/components/motion/page-transition";
import { IconButton } from "./icon-button";
import { SpringBottomSheet } from "./spring-bottom-sheet";
import { CommandPalette } from "./command-palette";
import { OfflineBanner } from "./offline-banner";
import { Avatar } from "./avatar";

function useActiveHref(items, pathname) {
  return useMemo(() => {
    const sorted = [...items].sort((a, b) => b.href.length - a.href.length);
    return sorted.find((it) => pathname === it.href || pathname.startsWith(`${it.href}/`))?.href ?? items[0]?.href;
  }, [items, pathname]);
}

/**
 * The shell every portal uses: desktop sidebar + sticky top bar, mobile top bar + bottom tab
 * bar with a morphing active pill and a "More" sheet. Page content gets the shared PageTransition.
 * A subtle per-portal accent comes from `accent` (sets --portal-accent); everything else is shared.
 *
 * @param {{
 *   brand: { name: string, tagline?: string, href?: string, logo?: React.ReactNode },
 *   nav: { label: string, href: string, icon: any, badge?: number|string }[],
 *   tabs?: string[],                 // hrefs shown in the mobile tab bar (max 4; default: first 4 of nav). Others go to "More".
 *   title?: string, subtitle?: string,
 *   actions?: React.ReactNode,       // top-bar actions (e.g. <NotificationBell/>)
 *   user?: { name: string, src?: string, role?: string },
 *   userMenu?: React.ReactNode,      // shown in the sidebar footer and the More sheet (e.g. logout button)
 *   accent?: "sage"|"teal"|"indigo"|"rose"|"amber",
 *   commands?: object[],             // CommandPalette groups; adds a search button + ⌘K
 *   fab?: React.ReactNode,           // e.g. <FloatingActionButton/>
 *   transitionKey?: string, children: React.ReactNode
 * }} props
 */
export function PortalShell({ brand, nav, tabs, title, subtitle, actions, user, userMenu, accent, commands, fab, transitionKey, children }) {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const { isDark, toggleTheme } = useAppThemeToggle();
  const activeHref = useActiveHref(nav, pathname);
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const tabItems = (tabs ? tabs.map((h) => nav.find((n) => n.href === h)).filter(Boolean) : nav.slice(0, 4)).slice(0, 4);
  const moreItems = nav.filter((n) => !tabItems.includes(n));
  const moreActive = moreItems.some((n) => n.href === activeHref);
  const pillTransition = reduce ? { duration: 0 } : spring.snappy;

  const themeButton = <IconButton icon={isDark ? Sun : Moon} label={isDark ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleTheme} variant="ghost" />;

  return (
    <div data-accent={accent} className="min-h-dvh bg-background text-foreground">
      <OfflineBanner />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-nav hidden w-[var(--sidebar-w)] flex-col border-r border-sidebar-border bg-sidebar pl-safe lg:flex">
        <Link to={brand.href ?? nav[0]?.href ?? "/"} className="flex items-center gap-3 px-5 pt-6 pb-5">
          {brand.logo ?? <span className="grid size-10 place-items-center rounded-xl bg-portal font-display text-lg font-bold text-portal-foreground">{brand.name.charAt(0)}</span>}
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-bold">{brand.name}</span>
            {brand.tagline ? <span className="block truncate text-caption text-ink-neutral">{brand.tagline}</span> : null}
          </span>
        </Link>
        <LayoutGroup id="shell-sidebar">
          <nav aria-label="Main" className="admin-scrollbar flex-1 space-y-1 overflow-y-auto px-3">
            {nav.map((item) => {
              const active = item.href === activeHref;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors duration-100", active ? "text-portal" : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}
                >
                  {active ? <motion.span layoutId="shell-side-pill" className="absolute inset-0 rounded-xl bg-portal/12" transition={pillTransition} /> : null}
                  <span className="relative grid size-8 place-items-center rounded-lg">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="relative flex-1 truncate">{item.label}</span>
                  {item.badge ? <span className="relative grid min-w-5 place-items-center rounded-full bg-portal px-1.5 text-[10px] font-bold leading-5 text-portal-foreground">{item.badge}</span> : null}
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>
        <div className="space-y-2 border-t border-sidebar-border p-3">
          {user ? (
            <div className="flex items-center gap-3 rounded-2xl p-2">
              <Avatar name={user.name} src={user.src} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{user.name}</span>
                {user.role ? <span className="block truncate text-caption text-ink-neutral">{user.role}</span> : null}
              </span>
              {themeButton}
            </div>
          ) : (
            <div className="flex justify-end">{themeButton}</div>
          )}
          {userMenu}
        </div>
      </aside>

      <div className="lg:pl-[var(--sidebar-w)]">
        {/* Top bar */}
        <header className="sticky top-0 z-sticky border-b border-border bg-background pt-safe">
          <div className="mx-auto flex h-[var(--topbar-h)] max-w-[var(--content-max)] items-center gap-3 px-[var(--gutter)]">
            <Link to={brand.href ?? nav[0]?.href ?? "/"} className="grid size-9 shrink-0 place-items-center rounded-xl bg-portal font-display font-bold text-portal-foreground lg:hidden" aria-label={`${brand.name} home`}>
              {brand.name.charAt(0)}
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-headline font-semibold sm:text-title">{title}</h1>
              {subtitle ? <p className="hidden truncate text-caption text-ink-neutral sm:block">{subtitle}</p> : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {commands?.length ? (
                <button type="button" onClick={() => setPaletteOpen(true)} className="hidden h-10 items-center gap-2 rounded-full bg-muted px-3.5 text-caption font-medium text-ink-neutral hover:text-foreground md:inline-flex" aria-label="Search (Ctrl+K)">
                  <Search className="size-4" aria-hidden /> Search <kbd className="rounded bg-card px-1.5 text-micro">⌘K</kbd>
                </button>
              ) : null}
              {commands?.length ? <IconButton icon={Search} label="Search" className="md:hidden" onClick={() => setPaletteOpen(true)} /> : null}
              {actions}
              <span className="lg:hidden">{themeButton}</span>
            </div>
          </div>
        </header>

        {/* With a floating action button, phones get room below the content so the button never
            sits on top of the last card's controls. */}
        <main
          className={cn(
            "mx-auto w-full max-w-[var(--content-max)] px-[var(--gutter)] pt-4 sm:pt-6 lg:pb-10",
            fab ? "pb-[calc(var(--tabbar-h)+var(--safe-bottom)+5.5rem)]" : "pb-[calc(var(--tabbar-h)+var(--safe-bottom)+1.5rem)]"
          )}
        >
          <PageTransition transitionKey={transitionKey}>{children}</PageTransition>
        </main>
      </div>

      {fab}

      {/* Mobile bottom tab bar */}
      <LayoutGroup id="shell-tabs">
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-nav border-t border-border bg-card pb-safe lg:hidden">
          <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-lg items-stretch px-2">
            {[...tabItems, ...(moreItems.length ? [{ href: "#more", label: "More", icon: MenuIcon }] : [])].map((item) => {
              const isMore = item.href === "#more";
              const active = isMore ? moreActive || moreOpen : item.href === activeHref;
              const Icon = item.icon;
              const inner = (
                <>
                  <span className="relative grid h-8 w-14 place-items-center">
                    {active ? <motion.span layoutId="shell-tab-pill" className="absolute inset-0 rounded-full bg-portal/14" transition={pillTransition} /> : null}
                    <span className="relative grid">
                      <Icon className="size-[22px]" aria-hidden strokeWidth={active ? 2.4 : 2} />
                    </span>
                    {item.badge ? <span className="absolute top-0 right-2 size-2 rounded-full bg-destructive ring-2 ring-card" aria-hidden /> : null}
                  </span>
                  <span className="text-[11px] leading-none font-semibold">{item.label}</span>
                </>
              );
              const cls = cn("flex h-full w-full flex-col items-center justify-center gap-1 transition-colors", active ? "text-portal" : "text-ink-neutral");
              return (
                <li key={item.href} className="flex-1">
                  {isMore ? (
                    <button type="button" className={cls} onClick={() => setMoreOpen(true)} aria-haspopup="dialog" aria-expanded={moreOpen}>
                      {inner}
                    </button>
                  ) : (
                    <Link to={item.href} className={cls} aria-current={active ? "page" : undefined} onClick={() => haptic("tap")}>
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </LayoutGroup>

      {moreItems.length ? (
        <SpringBottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="More" hideHeader={false} footer={userMenu}>
          <div className="grid grid-cols-3 gap-2 pb-2">
            {moreItems.map((item) => {
              const active = item.href === activeHref;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex flex-col items-center gap-2 rounded-2xl p-3 text-center text-caption font-semibold ring-1 ring-inset transition-colors", active ? "bg-portal/12 text-portal ring-portal/30" : "bg-card ring-border/60 hover:bg-muted")}
                >
                  <span className={cn("grid size-11 place-items-center rounded-2xl", active ? "bg-portal text-portal-foreground" : "bg-muted text-foreground")}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="line-clamp-2">{item.label}</span>
                </Link>
              );
            })}
          </div>
          {user ? (
            <div className="mt-2 flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
              <Avatar name={user.name} src={user.src} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{user.name}</span>
              <IconButton icon={X} label="Close" size="sm" onClick={() => setMoreOpen(false)} />
            </div>
          ) : null}
        </SpringBottomSheet>
      ) : null}

      {commands?.length ? <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} groups={commands} /> : null}
    </div>
  );
}
