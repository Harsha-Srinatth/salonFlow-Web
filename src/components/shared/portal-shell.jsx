"use client";
import { Button } from "@/components/ui/button";
import { useAppThemeToggle } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Calendar, Menu, Moon, Settings, Sun } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
export function PortalShell({ portalName, pageTitle, navItems, actions, children }) {
    const { pathname } = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const { isDark, toggleTheme } = useAppThemeToggle();
    const activeHref = useMemo(() => {
        const normalize = (href) => href.split("#")[0];
        const sorted = [...navItems].sort((a, b) => normalize(b.href).length - normalize(a.href).length);
        const exactMatch = sorted.find(item => pathname === normalize(item.href));
        if (exactMatch)
            return exactMatch.href;
        const segmentMatch = sorted.find(item => {
            const baseHref = normalize(item.href);
            return baseHref !== "/" && pathname.startsWith(`${baseHref}/`);
        });
        return segmentMatch?.href ?? navItems[0]?.href;
    }, [navItems, pathname]);
    return (<div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        <aside className="hidden h-full w-[272px] shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <div className="px-6 py-6 text-xl font-semibold tracking-tight">{portalName}</div>
          <nav className="space-y-1 px-3">
            {navItems.map(item => (<Link key={item.href} to={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", activeHref === item.href
                ? "bg-sidebar-active/20 text-sidebar-active"
                : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground")}>
                <item.icon className="size-4"/>
                <span>{item.label}</span>
              </Link>))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
            <div className="flex h-16 items-center justify-between px-4 md:px-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(prev => !prev)} aria-label="Toggle portal menu">
                  <Menu className="size-5"/>
                </Button>
                <h1 className="text-lg font-semibold">{pageTitle}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="hidden h-9 gap-2 sm:flex">
                  <Calendar className="size-4"/>
                  <span>Today</span>
                </Button>
                <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={toggleTheme}>
                  {isDark ? <Sun className="size-5"/> : <Moon className="size-5"/>}
                </Button>
                <Button variant="ghost" size="icon" aria-label="Portal settings">
                  <Settings className="size-5"/>
                </Button>
                {actions}
              </div>
            </div>
          </header>

          {mobileOpen ? (<div className="border-b border-sidebar-border bg-sidebar px-3 py-3 text-sidebar-foreground lg:hidden">
              <nav className="space-y-1">
                {navItems.map(item => (<Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", activeHref === item.href
                    ? "bg-sidebar-active/20 text-sidebar-active"
                    : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground")}>
                    <item.icon className="size-4"/>
                    <span>{item.label}</span>
                  </Link>))}
              </nav>
            </div>) : null}

          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>);
}
