import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { BadgeCheck, CalendarClock, CalendarPlus, ListChecks, Route } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { spring } from "@/components/motion/presets";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { BUTTON_SIZES, BUTTON_VARIANTS } from "@/components/kit/button-loading-morph";
import { SectionHeading } from "./section-heading";
import { BOOK_HREF } from "./landing-data";

// Mirrors the real booking flow (customer appointments page): services → free slot → pay online.
const STEPS = [
  { icon: ListChecks, title: "Pick services", sub: "Hair, skin, spa & more" },
  { icon: CalendarClock, title: "Choose a time", sub: "Free slots today or tomorrow" },
  { icon: BadgeCheck, title: "Pay & you're in", sub: "Pay online to confirm" },
];

function Step({ step, index, progress }) {
  const reduce = useReducedMotion();
  const at = index / (STEPS.length - 1);
  // Each tile "lights up" as the progress line reaches it (opacity of a filled layer only).
  const lit = useTransform(progress, [Math.max(0, at - 0.12), at + 0.001], [0, 1]);
  const Icon = step.icon;
  return (
    <li className="relative flex items-center gap-5 md:flex-col md:text-center">
      <motion.div
        initial={reduce ? false : { scale: 0.5, rotate: -12, opacity: 0 }}
        whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ ...spring.bouncy, delay: index * 0.08 }}
        className="relative grid size-20 shrink-0 place-items-center rounded-3xl bg-card text-ink-primary shadow-lift ring-1 ring-border/70"
      >
        <Icon className="size-8" aria-hidden />
        <motion.span aria-hidden style={{ opacity: lit }} className="absolute inset-0 grid place-items-center rounded-3xl bg-portal text-portal-foreground shadow-glow">
          <Icon className="size-8" />
        </motion.span>
        <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-foreground text-caption font-bold text-background tabular-nums">{index + 1}</span>
      </motion.div>
      <div>
        <h3 className="font-display text-headline font-bold sm:text-title">{step.title}</h3>
        <p className="mt-1 text-sm text-ink-neutral">{step.sub}</p>
      </div>
    </li>
  );
}

/** Three animated icon steps joined by a line that draws itself as you scroll. */
export default function HowItWorksSection() {
  const listRef = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 80%", "end 55%"] });
  const progress = useSpring(scrollYProgress, { ...spring.soft, restDelta: 0.001 });
  const line = reduce ? scrollYProgress : progress;

  return (
    <section id="how" aria-labelledby="how-title" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-[var(--content-max)] px-[var(--gutter)]">
        <SectionHeading id="how-title" icon={Route} overline="How it works" title="Booked in three taps" accent={["three"]} />

        <div className="relative mx-auto mt-14 max-w-4xl">
          {/* Track + drawn line: vertical on phones, horizontal from md. scaleX/scaleY only. */}
          <div aria-hidden className="absolute top-10 bottom-10 left-10 w-0.5 -translate-x-1/2 rounded-full bg-border md:top-10 md:right-[16.66%] md:bottom-auto md:left-[16.66%] md:h-0.5 md:w-auto md:translate-x-0 md:-translate-y-1/2" />
          <motion.div aria-hidden style={{ scaleY: line }} className="absolute top-10 bottom-10 left-10 w-0.5 origin-top -translate-x-1/2 rounded-full bg-gradient-to-b from-portal to-accent md:hidden" />
          <motion.div aria-hidden style={{ scaleX: line }} className="absolute top-10 right-[16.66%] left-[16.66%] hidden h-0.5 origin-left -translate-y-1/2 rounded-full bg-gradient-to-r from-portal to-accent md:block" />

          <ol ref={listRef} className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            {STEPS.map((step, i) => (
              <Step key={step.title} step={step} index={i} progress={line} />
            ))}
          </ol>
        </div>

        <div className="mt-14 flex justify-center">
          <MagneticButton>
            <Link to={BOOK_HREF} className={cn("shine inline-flex items-center justify-center rounded-full font-semibold", BUTTON_VARIANTS.primary, BUTTON_SIZES.lg, "rounded-full")}>
              <CalendarPlus className="size-5" aria-hidden /> Start booking
            </Link>
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
