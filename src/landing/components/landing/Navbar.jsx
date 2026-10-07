import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { CalendarPlus, LogIn, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { haptic, spring, stagger } from "@/components/motion/presets";
import { MagneticButton } from "@/components/motion/magnetic-button";
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
      <span className="grid size-10 place-items-center rounded-2xl bg-portal font-display text-lg font-bold text-portal-foreground shadow-glow">S</span>
      <span className="font-display text-xl font-bold tracking-tight">Sahasra</span>
    </span>
  );
}

/**
 * Transparent bar over the hero that morphs into a floating glass pill once you scroll, hides while
 * scrolling down and returns on the way up. A sliding pill marks the section in view.
 */
export default function Navbar() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);
  const headerRef = useRef(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    if (y > 480 && y > prev + 6) setHidden(true);
    else if (y < prev - 6 || y < 480) setHidden(false);
  });

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
      <motion.div
        initial={false}
        animate={{ y: hidden && !open ? "-130%" : "0%" }}
        transition={reduce ? { duration: 0 } : spring.sheet}
        className="pointer-events-auto relative mx-auto max-w-6xl pl-safe pr-safe"
      >
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: solid ? 1 : 0, scaleX: solid ? 1 : 1.04, scaleY: solid ? 1 : 1.2 }}
          transition={spring.soft}
          className="glass-strong absolute inset-x-0 top-0 h-16 rounded-full"
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
                  className={cn("relative inline-flex h-11 items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition-colors lg:px-4", active === id ? "text-ink-primary" : "text-foreground/80 hover:text-foreground")}
                >
                  {active === id ? <motion.span layoutId="landing-nav-pill" className="absolute inset-0 -z-[1] rounded-full bg-portal/12" transition={spring.snappy} /> : null}
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
            <MagneticButton strength={0.25} className="hidden sm:inline-flex">
              <Link to={BOOK_HREF} className={cn("shine inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold", BUTTON_VARIANTS.primary)}>
                <CalendarPlus className="size-4" aria-hidden /> Book now
              </Link>
            </MagneticButton>
            <motion.button
              type="button"
              whileTap={reduce ? undefined : { scale: 0.92 }}
              onClick={() => {
                haptic("tap");
                setOpen((v) => !v);
              }}
              aria-expanded={open}
              aria-controls="landing-mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="grid size-11 place-items-center rounded-full transition-colors hover:bg-muted md:hidden"
            >
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span key={open ? "x" : "m"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={spring.snappy} className="grid">
                  {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </nav>

        <AnimatePresence>
          {open ? (
            <motion.div
              id="landing-mobile-menu"
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={spring.sheet}
              className="glass-strong mt-2 origin-top rounded-sheet p-3 md:hidden"
            >
              <motion.ul initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: stagger.tight } } }} className="grid grid-cols-2 gap-2">
                {NAV_LINKS.map(({ id, label, icon: Icon }) => (
                  <motion.li key={id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: spring.soft } }}>
                    <a href={`#${id}`} onClick={() => setOpen(false)} className="flex h-16 flex-col justify-center gap-1 rounded-2xl bg-card/70 px-4 text-sm font-semibold">
                      <Icon className="size-5 text-ink-primary" aria-hidden />
                      {label}
                    </a>
                  </motion.li>
                ))}
              </motion.ul>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link to="/auth/login" onClick={() => setOpen(false)} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-control text-sm font-semibold", BUTTON_VARIANTS.outline)}>
                  <LogIn className="size-4" aria-hidden /> Sign in
                </Link>
                <Link to={BOOK_HREF} onClick={() => setOpen(false)} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-control text-sm font-semibold", BUTTON_VARIANTS.primary)}>
                  <CalendarPlus className="size-4" aria-hidden /> Book now
                </Link>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
