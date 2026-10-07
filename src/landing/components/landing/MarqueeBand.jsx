import { Sparkle } from "lucide-react";
import { SERVICE_CATEGORIES } from "./landing-data";

/** Decorative ribbon of service names sliding by (CSS transform loop, paused for reduced motion and on hover). */
export default function MarqueeBand() {
  const words = SERVICE_CATEGORIES.map((c) => ({ id: c.id, label: c.title.split(" & ")[0], icon: c.icon }));
  const row = (copy) =>
    words.map(({ id, label, icon: Icon }) => (
      <li key={`${copy}-${id}`} className="flex shrink-0 items-center gap-5 pr-5 sm:gap-8 sm:pr-8">
        <Icon className="size-6 text-ink-primary sm:size-8" aria-hidden />
        <span className="font-display text-display-lg font-bold whitespace-nowrap italic">{label}</span>
        <Sparkle className="size-5 fill-accent text-accent" aria-hidden />
      </li>
    ));
  return (
    <div aria-hidden className="landing-marquee-wrap landing-fade-x relative -rotate-2 overflow-hidden border-y border-border/70 bg-card/60 py-4 sm:py-5">
      <ul className="landing-marquee flex w-max">
        {row("a")}
        {row("b")}
      </ul>
    </div>
  );
}
