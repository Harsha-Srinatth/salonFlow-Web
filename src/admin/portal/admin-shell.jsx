"use client";
import { useAuth } from "@/components/auth/auth-provider";
import { useAppThemeToggle } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/shared/notification-bell";
import { useEntrance, useRevealOnReady } from "@/admin/lib/motion";
import {
    ChevronRight,
    LogOut,
    Menu,
    Moon,
    PanelLeftClose,
    PanelLeftOpen,
    Settings,
    Sparkles,
    Sun,
    User,
    X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { GlideGroup } from "@/admin/components/glide-nav";
import { adminNavGroups } from "./nav-config";

function useLiveClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(timer);
    }, []);
    return now;
}

function useActiveHref(pathname) {
    return useMemo(() => {
        const normalize = (href) => href.split("#")[0];
        const flat = adminNavGroups.flatMap((group) => group.items);
        const sorted = [...flat].sort((a, b) => normalize(b.href).length - normalize(a.href).length);
        const exact = sorted.find((item) => pathname === normalize(item.href));
        if (exact) return exact.href;
        const segment = sorted.find((item) => {
            const base = normalize(item.href);
            return base !== "/admin-dashboard" && pathname.startsWith(`${base}/`);
        });
        return segment?.href ?? flat[0]?.href;
    }, [pathname]);
}

function initialsFor(name, email) {
    const source = (name || email || "A").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
}

function NavItem({ item, isActive, collapsed, onNavigate }) {
    const Icon = item.icon;
    return (
        <Link
            to={item.href}
            onClick={onNavigate}
            data-glide-row
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 active:scale-[0.98]",
                collapsed && "justify-center px-2",
                isActive
                    ? "bg-sidebar-active/12 text-sidebar-active shadow-[inset_0_0_0_1px] shadow-sidebar-active/20"
                    : "text-sidebar-muted hover:text-sidebar-foreground"
            )}
        >
            {isActive ? (
                <motion.span layoutId="admin-nav-bar" transition={{ type: "spring", stiffness: 500, damping: 36 }} className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-sidebar-active" />
            ) : null}
            <Icon className={cn("size-[18px] shrink-0 transition-transform duration-200", isActive && "scale-110")} />
            {!collapsed ? (
                <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium leading-tight">{item.label}</span>
                    {item.description ? (
                        <span className="truncate text-[11px] leading-tight text-sidebar-muted/80">{item.description}</span>
                    ) : null}
                </span>
            ) : null}
        </Link>
    );
}

function SidebarContent({ collapsed, activeHref, onNavigate }) {
    const navRef = useRevealOnReady([], { distance: 10, selector: ":scope [data-nav-item]" });
    // On first load bring the active entry into view; after that the sidebar is never remounted, so its scroll position sticks.
    useEffect(() => {
        navRef.current?.querySelector("[aria-current=page]")?.scrollIntoView({ block: "nearest" });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <nav ref={navRef} className="admin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6">
            <GlideGroup className="space-y-5">
            {adminNavGroups.map((group) => (
                <div key={group.label} data-nav-item className="space-y-1.5">
                    {!collapsed ? (
                        <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted/70">
                            {group.label}
                        </p>
                    ) : (
                        <div className="mx-3 h-px bg-sidebar-border" />
                    )}
                    {group.items.map((item) => (
                        <NavItem
                            key={item.href}
                            item={item}
                            isActive={activeHref === item.href}
                            collapsed={collapsed}
                            onNavigate={onNavigate}
                        />
                    ))}
                </div>
            ))}
            </GlideGroup>
        </nav>
    );
}

function BrandMark({ collapsed }) {
    return (
        <div className={cn("flex items-center gap-2.5 px-4 py-5", collapsed && "justify-center px-2")}>
            <div className="admin-hero-surface flex size-9 shrink-0 items-center justify-center rounded-xl text-primary-foreground admin-shadow-md">
                <Sparkles className="size-[18px]" />
            </div>
            {!collapsed ? (
                <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold leading-tight tracking-tight">Sahasra</p>
                    <p className="truncate text-[11px] leading-tight text-sidebar-muted">Admin Console</p>
                </div>
            ) : null}
        </div>
    );
}

export function AdminShell({ pageTitle, description, actions, slotRefs, children }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { appUser, logout } = useAuth();
    const { isDark, toggleTheme } = useAppThemeToggle();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const activeHref = useActiveHref(pathname);
    const clock = useLiveClock();
    const headerRef = useEntrance({ distance: 8 });
    const mainRef = useRef(null);

    useEffect(() => {
        setMobileOpen(false);
        mainRef.current?.scrollTo({ top: 0 });
    }, [pathname]);

    const activeNavLabel = useMemo(() => {
        const flat = adminNavGroups.flatMap((g) => g.items);
        return flat.find((item) => item.href === activeHref)?.label;
    }, [activeHref]);

    async function handleLogout() {
        try {
            await logout();
            navigate("/auth/login", { replace: true });
        } catch {
            toast.error("Logout failed. Please try again.");
        }
    }

    const timeLabel = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const dateLabel = clock.toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short" });

    return (
        <div className="h-dvh overflow-hidden bg-background text-foreground">
            <div className="flex h-full">
                {/* Desktop sidebar */}
                <aside
                    className={cn(
                        "admin-sidebar-surface hidden h-full shrink-0 flex-col border-r border-sidebar-border text-sidebar-foreground transition-[width] duration-300 ease-out lg:flex",
                        collapsed ? "w-[76px]" : "w-[268px]"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <BrandMark collapsed={collapsed} />
                    </div>
                    <LayoutGroup id="nav-desktop"><SidebarContent collapsed={collapsed} activeHref={activeHref} onNavigate={() => {}} /></LayoutGroup>
                    <div className="border-t border-sidebar-border p-3">
                        <button
                            type="button"
                            onClick={() => setCollapsed((v) => !v)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        >
                            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
                            {!collapsed ? <span>Collapse</span> : null}
                        </button>
                    </div>
                </aside>

                {/* Mobile drawer */}
                <AnimatePresence>
                    {mobileOpen ? (
                        <div className="fixed inset-0 z-40 lg:hidden">
                            <motion.div
                                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setMobileOpen(false)}
                            />
                            <motion.aside
                                initial={{ x: "-100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "-100%" }}
                                transition={{ type: "spring", stiffness: 380, damping: 40 }}
                                className="admin-sidebar-surface relative flex h-full w-[min(300px,85vw)] flex-col border-r border-sidebar-border pb-[env(safe-area-inset-bottom)] text-sidebar-foreground shadow-2xl"
                            >
                                <div className="flex items-center justify-between pr-3">
                                    <BrandMark collapsed={false} />
                                    <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                                        <X className="size-5" />
                                    </Button>
                                </div>
                                <LayoutGroup id="nav-mobile"><SidebarContent collapsed={false} activeHref={activeHref} onNavigate={() => setMobileOpen(false)} /></LayoutGroup>
                            </motion.aside>
                        </div>
                    ) : null}
                </AnimatePresence>

                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <header
                        ref={headerRef}
                        className="admin-topbar-surface sticky top-0 z-20 border-b border-border/70 backdrop-blur-md"
                    >
                        <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="lg:hidden"
                                    onClick={() => setMobileOpen((v) => !v)}
                                    aria-label="Toggle portal menu"
                                >
                                    <Menu className="size-5" />
                                </Button>
                                <div className="min-w-0">
                                    <div className="hidden items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:flex">
                                        <span>Admin</span>
                                        <ChevronRight className="size-3" />
                                        <span className="text-foreground/80">{activeNavLabel ?? pageTitle}</span>
                                    </div>
                                    <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">{pageTitle}</h1>
                                    {description ? (
                                        <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <div className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
                                    <span className="admin-live-dot relative inline-flex size-1.5 rounded-full bg-emerald-500 text-emerald-500" />
                                    <span className="tabular-nums">{timeLabel}</span>
                                    <span className="text-muted-foreground/60">•</span>
                                    <span>{dateLabel}</span>
                                </div>

                                <NotificationBell portal="admin" />

                                <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
                                    {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
                                </Button>

                                {slotRefs ? <div ref={slotRefs.desktop} className="hidden items-center gap-2 empty:hidden sm:flex" /> : actions ? <div className="hidden items-center gap-2 sm:flex">{actions}</div> : null}

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="ml-1 flex items-center gap-2 rounded-full border border-border/70 bg-card/60 py-1 pl-1 pr-2.5 transition-colors hover:bg-accent"
                                        >
                                            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                                                {initialsFor(appUser?.name, appUser?.email)}
                                            </span>
                                            <span className="hidden max-w-[110px] truncate text-sm font-medium md:inline">
                                                {appUser?.name?.split(" ")[0] ?? "Admin"}
                                            </span>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-60">
                                        <DropdownMenuLabel className="font-normal">
                                            <p className="truncate text-sm font-semibold">{appUser?.name ?? "Administrator"}</p>
                                            <p className="truncate text-xs text-muted-foreground">{appUser?.email ?? ""}</p>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link to="/admin-dashboard/settings">
                                                <Settings className="size-4" /> Salon settings
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link to="/admin-dashboard/staff/permissions">
                                                <User className="size-4" /> Staff permissions
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem variant="destructive" onClick={() => void handleLogout()}>
                                            <LogOut className="size-4" /> Sign out
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {slotRefs ? (
                            <div ref={slotRefs.mobile} className="flex items-center gap-2 border-t border-border/60 px-4 py-2 empty:hidden sm:hidden" />
                        ) : actions ? (
                            <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2 sm:hidden">{actions}</div>
                        ) : null}
                    </header>

                    <main ref={mainRef} className="admin-scrollbar flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6">
                        <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: "easeOut" }} className="mx-auto max-w-[1600px]">
                            {children}
                        </motion.div>
                    </main>
                </div>
            </div>
        </div>
    );
}
