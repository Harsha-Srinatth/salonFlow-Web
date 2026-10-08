import { CalendarPlus, LogIn, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BUTTON_VARIANTS } from "@/components/kit/button-loading-morph";
import { LandingThemeToggle } from "@/components/kit-extra/landing-theme-toggle";
import { BOOK_HREF, NAV_LINKS } from "./landing-data";

/** Id of the section currently crossing the middle of the viewport. */
function useActiveSection(ids) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setActive(hit.target.id);
        else if (entries.some((e) => e.target === els[0] && e.boundingClientRect.top > 0)) setActive(null);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const SECTION_IDS = NAV_LINKS.map((l) => l.id);

export function BrandMark({ className }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-10 place-items-center rounded-2xl bg-portal font-display text-lg font-bold text-portal-foreground">S</span>
      <span className="font-display text-xl font-bold tracking-tight">Sahasra</span>
    </span>
  );
}

/** Bar over the hero that gains a solid background once you scroll, hides while scrolling down and returns on the way up. */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);
  const headerRef = useRef(null);

  useEffect(() => {
    let prev = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        setScrolled(y > 24);
        if (y > 480 && y > prev + 6) setHidden(true);
        else if (y < prev - 6 || y < 480) setHidden(false);
        prev = y;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onDown = (e) => headerRef.current && !headerRef.current.contains(e.target) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <header ref={headerRef} className="pointer-events-none fixed inset-x-0 top-0 z-nav px-3 pt-[calc(0.5rem+var(--safe-top))] sm:px-4">
      <div
        className={cn(
          "pointer-events-auto relative mx-auto max-w-6xl pl-safe pr-safe transition-transform duration-200 ease-out motion-reduce:transition-none",
          hidden && !open && "-translate-y-[130%]"
        )}
      >
        <div
          aria-hidden
          className={cn("absolute inset-x-0 top-0 h-16 rounded-full border bg-popover transition-opacity duration-150", solid ? "border-border opacity-100" : "border-transparent opacity-0")}
        />
        <nav aria-label="Primary" className="relative flex h-16 items-center gap-2 px-2 sm:px-3">
          <Link to="/" aria-label="Sahasra home" className="mr-auto rounded-full md:mr-0" onClick={() => window.scrollTo({ top: 0 })}>
            <BrandMark />
          </Link>

          <ul className="mx-auto hidden items-center gap-0.5 md:flex">
            {NAV_LINKS.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={active === id ? "true" : undefined}
                  className={cn(
                    "relative inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors lg:px-4",
                    active === id ? "bg-portal/12 text-ink-primary" : "text-foreground/80 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <LandingThemeToggle />
            <Link to="/auth/login" className="hidden h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors hover:bg-muted lg:inline-flex">
              <LogIn className="size-4" aria-hidden /> Sign in
            </Link>
            <Link to={BOOK_HREF} className={cn("hidden h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold sm:inline-flex", BUTTON_VARIANTS.primary)}>
              <CalendarPlus className="size-4" aria-hidden /> Book now
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="landing-mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid size-11 place-items-center rounded-full transition-colors hover:bg-muted active:scale-95 md:hidden"
            >
              {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </button>
          </div>
        </nav>

        {open ? (
          <div id="landing-mobile-menu" className="glass-strong mt-2 rounded-sheet p-3 animate-in fade-in-0 slide-in-from-top-1 duration-150 md:hidden">
            <ul className="grid grid-cols-2 gap-2">
              {NAV_LINKS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={() => setOpen(false)} className="flex h-16 flex-col justify-center gap-1 rounded-xl bg-muted/60 px-4 text-sm font-semibold">
                    <Icon className="size-5 text-ink-primary" aria-hidden />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to="/auth/login" onClick={() => setOpen(false)} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-control text-sm font-semibold", BUTTON_VARIANTS.outline)}>
                <LogIn className="size-4" aria-hidden /> Sign in
              </Link>
              <Link to={BOOK_HREF} onClick={() => setOpen(false)} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-control text-sm font-semibold", BUTTON_VARIANTS.primary)}>
                <CalendarPlus className="size-4" aria-hidden /> Book now
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
