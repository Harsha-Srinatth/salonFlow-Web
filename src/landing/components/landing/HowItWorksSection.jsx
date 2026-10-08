import { BadgeCheck, CalendarClock, CalendarPlus, ListChecks, Route } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BUTTON_SIZES, BUTTON_VARIANTS } from "@/components/kit/button-loading-morph";
import { SectionHeading } from "./section-heading";
import { BOOK_HREF } from "./landing-data";

// Mirrors the real booking flow (customer appointments page): services → free slot → pay online.
const STEPS = [
  { icon: ListChecks, title: "Pick services", sub: "Hair, skin, spa & more" },
  { icon: CalendarClock, title: "Choose a time", sub: "Free slots today or tomorrow" },
  { icon: BadgeCheck, title: "Pay & you're in", sub: "Pay online to confirm" },
];

/** Three numbered steps joined by a line. */
export default function HowItWorksSection() {
  return (
    <section id="how" aria-labelledby="how-title" className="relative py-16 sm:py-24">
      <div className="mx-auto w-full max-w-[var(--content-max)] px-[var(--gutter)]">
        <SectionHeading id="how-title" icon={Route} overline="How it works" title="Booked in three taps" accent={["three"]} />

        <div className="relative mx-auto mt-12 max-w-4xl">
          <div aria-hidden className="absolute top-10 bottom-10 left-10 w-px -translate-x-1/2 bg-border md:top-10 md:right-[16.66%] md:bottom-auto md:left-[16.66%] md:h-px md:w-auto md:translate-x-0" />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative flex items-center gap-5 md:flex-col md:text-center">
                  <div className="relative grid size-20 shrink-0 place-items-center rounded-2xl border border-border bg-card text-ink-primary">
                    <Icon className="size-8" aria-hidden />
                    <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-foreground text-caption font-bold text-background tabular-nums">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-headline font-bold sm:text-title">{step.title}</h3>
                    <p className="mt-1 text-sm text-ink-neutral">{step.sub}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-12 flex justify-center">
          <Link to={BOOK_HREF} className={cn("inline-flex items-center justify-center font-semibold", BUTTON_VARIANTS.primary, BUTTON_SIZES.lg, "rounded-full")}>
            <CalendarPlus className="size-5" aria-hidden /> Start booking
          </Link>
        </div>
      </div>
    </section>
  );
}
