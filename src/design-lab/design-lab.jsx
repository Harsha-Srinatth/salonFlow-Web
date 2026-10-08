import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Monitor, Moon, Smartphone, Sun, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppThemeToggle } from "@/components/theme-provider";
import { ScrollProgress } from "@/components/motion";
import { Feedback, Foundations, Loaders, MotionSection } from "./sections-a";
import { DateTime, Forms, NavSection, Overlays } from "./sections-b";
import { DataSection, Rewards, States } from "./sections-c";
import { AuthDemo, ShellDemo } from "./demos";

const SECTIONS = [
  ["foundations", "Foundations", Foundations],
  ["motion", "Motion", MotionSection],
  ["loaders", "Loaders", Loaders],
  ["feedback", "Toasts", Feedback],
  ["overlays", "Overlays", Overlays],
  ["datetime", "Date & time", DateTime],
  ["forms", "Forms", Forms],
  ["navigation", "Navigation", NavSection],
  ["data", "Data", DataSection],
  ["rewards", "Rewards", Rewards],
  ["states", "States", States],
];

const FRAMES = [
  ["live", "Live", Monitor],
  ["390", "390", Smartphone],
  ["768", "768", Tablet],
  ["1440", "1440", Monitor],
];

/**
 * DEV-ONLY component gallery (route /design-lab, never in production builds or navigation).
 * Query params: ?theme=light|dark  ?section=<id>  ?demo=shell|auth  ?accent=<preset>  ?frame=1 (no chrome)
 */
export default function DesignLab() {
  const [params] = useSearchParams();
  const { theme, toggleTheme } = useAppThemeToggle();
  const forcedTheme = params.get("theme");
  const only = params.get("section");
  const demo = params.get("demo");
  const embedded = params.get("frame") === "1";
  const [frame, setFrame] = useState("live");
  const { pathname } = useLocation();
  // The shell demo navigates between /design-lab/* sub-paths; keep its accent across them.
  const [accent] = useState(() => params.get("accent") ?? undefined);

  useEffect(() => {
    if ((forcedTheme === "light" || forcedTheme === "dark") && forcedTheme !== theme) toggleTheme();
    // Only react to the URL, not to manual toggles (toggleTheme's identity changes every render).
  }, [forcedTheme]);

  useEffect(() => {
    document.title = "Design lab · Sahasra";
  }, []);

  const frameSrc = useMemo(() => {
    const p = new URLSearchParams(params);
    p.set("frame", "1");
    p.set("theme", theme);
    return `/design-lab?${p.toString()}`;
  }, [params, theme]);

  if (demo === "shell" || pathname.startsWith("/design-lab/")) return <ShellDemo accent={accent} />;
  if (demo === "auth") return <AuthDemo />;

  const shown = only ? SECTIONS.filter(([id]) => id === only) : SECTIONS;

  return (
    <div className="min-h-dvh bg-background">
      {!embedded ? <ScrollProgress /> : null}
      {!embedded ? (
        <header className="glass-surface sticky top-0 z-sticky border-x-0 border-t-0 pt-safe">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-[var(--gutter)] py-3">
            <Link to="/design-lab" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-portal font-display font-bold text-portal-foreground">S</span>
              <span className="font-display text-lg font-bold">Design lab</span>
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-micro font-bold text-ink-warning">DEV ONLY</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex rounded-full bg-muted p-1" role="radiogroup" aria-label="Preview width">
                {FRAMES.map(([id, label, Icon]) => (
                  <button key={id} type="button" role="radio" aria-checked={frame === id} onClick={() => setFrame(id)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-caption font-semibold", frame === id ? "bg-card shadow-soft" : "text-ink-neutral")}>
                    <Icon className="size-3.5" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="grid size-10 place-items-center rounded-full bg-muted">
                {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
              </button>
            </div>
            <nav aria-label="Sections" className="no-scrollbar -mx-1 flex w-full gap-1.5 overflow-x-auto px-1">
              {SECTIONS.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="inline-flex h-8 shrink-0 items-center rounded-full bg-muted/70 px-3 text-caption font-semibold hover:bg-portal/12 hover:text-portal">
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </header>
      ) : null}

      {frame !== "live" && !embedded ? (
        <div className="overflow-x-auto p-4">
          <iframe title={`Preview at ${frame}px`} src={frameSrc} className="mx-auto block h-[calc(100dvh-9rem)] rounded-card border border-border bg-background shadow-float" style={{ width: Number(frame), maxWidth: "none" }} />
        </div>
      ) : (
        <main className="mx-auto max-w-[1440px] px-[var(--gutter)] pb-24">
          {shown.map(([id, , Comp]) => (
            <Comp key={id} />
          ))}
        </main>
      )}
    </div>
  );
}
