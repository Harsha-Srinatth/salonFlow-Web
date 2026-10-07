import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowUpRight, Baby, LayoutGrid, MoveRight, Scissors, User, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ease, interaction, prefersReducedMotion, spring, stagger } from "@/components/motion/presets";
import { loadGsap } from "@/components/motion/lazy-landing";
import { AnimatedTabBar } from "@/components/kit/animated-tab-bar";
import { SectionHeading } from "./section-heading";
import { LandingPhoto } from "./LandingPhoto";
import { BOOK_HREF, SERVICE_CATEGORIES } from "./landing-data";

const PIN_QUERY = "(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)";

/** WOMEN/MEN/UNISEX/BOY/GIRL/CHILDREN → tab groups. Unisex services show under Women and Men. */
const AUDIENCE_GROUPS = { WOMEN: ["WOMEN"], MEN: ["MEN"], UNISEX: ["WOMEN", "MEN"], BOY: ["KIDS"], GIRL: ["KIDS"], CHILDREN: ["KIDS"], KIDS: ["KIDS"] };
const AUDIENCE_TABS = [
  { value: "ALL", label: "All", icon: LayoutGrid },
  { value: "WOMEN", label: "Women", icon: UserRound },
  { value: "MEN", label: "Men", icon: User },
  { value: "KIDS", label: "Kids", icon: Baby },
];
const groupsOf = (item) => AUDIENCE_GROUPS[`${item.audience ?? ""}`.toUpperCase()] ?? [];

function ServiceCard({ item, index }) {
  const reduce = useReducedMotion();
  const Icon = item.icon;
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      whileHover={reduce ? undefined : interaction.cardHover}
      transition={{ ...spring.soft, delay: Math.min(index, 5) * stagger.base }}
      className="group relative aspect-[4/5] w-[min(76vw,20rem)] shrink-0 snap-start overflow-hidden rounded-card bg-card shadow-soft transition-shadow duration-300 hover:shadow-lift lg:w-[23rem]"
    >
      {item.image ? (
        <div className="absolute inset-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.06]">
          <LandingPhoto
            {...item.image}
            icon={Icon}
            sizes="(min-width: 1024px) 23rem, 76vw"
            loading="lazy"
            decoding="async"
            initial={reduce ? false : { scale: 1.3, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.3, ease: ease.outExpo }}
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(150deg,hsl(var(--portal-accent)),hsl(var(--ink-info))_130%)]">
          <div className="grain absolute inset-0" />
          <Icon className="absolute -top-6 -right-8 size-56 rotate-12 text-white/15 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:rotate-0" strokeWidth={1.25} />
        </div>
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[hsl(222_40%_6%/0.85)] via-[hsl(222_40%_6%/0.15)] to-transparent" />

      <span aria-hidden className="absolute top-4 left-5 font-display text-sm font-bold text-white/80 tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span aria-hidden className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-white text-[hsl(222_45%_10%)] shadow-soft transition-transform duration-500 ease-[var(--ease-spring)] group-hover:rotate-45">
        <ArrowUpRight className="size-5" />
      </span>

      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <span className="grid size-11 place-items-center rounded-2xl bg-white/20">
          <Icon className="size-5" aria-hidden />
        </span>
        <h3 className="mt-3 font-display text-title font-bold">{item.title}</h3>
        <p className="mt-1 text-caption text-white/85">{item.label}</p>
      </div>
      <Link to={BOOK_HREF} aria-label={`Book ${item.title}`} className="absolute inset-0 z-raised rounded-card" />
    </motion.li>
  );
}

/**
 * Services showcase. Desktop: the section pins and the cards travel sideways as you scroll
 * (GSAP ScrollTrigger, lazy). Phones, short screens and reduced motion: a native snap rail.
 */
export default function ServicesSection({ items = SERVICE_CATEGORIES }) {
  const pinRef = useRef(null);
  const railRef = useRef(null);
  const trackRef = useRef(null);
  const [pinned, setPinned] = useState(false);
  const [tab, setTab] = useState("ALL");

  const showTabs = useMemo(() => new Set(items.flatMap(groupsOf)).size > 1, [items]);
  const shown = showTabs && tab !== "ALL" ? items.filter((item) => groupsOf(item).includes(tab)) : items;

  useEffect(() => {
    if (!window.matchMedia(PIN_QUERY).matches || prefersReducedMotion()) return undefined;
    let mm = null;
    let cancelled = false;
    loadGsap().then((lib) => {
      if (!lib || cancelled) return;
      const { gsap, ScrollTrigger } = lib;
      mm = gsap.matchMedia();
      mm.add(PIN_QUERY, () => {
        setPinned(true);
        const track = trackRef.current;
        const distance = () => Math.max(0, track.scrollWidth - railRef.current.clientWidth);
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: { trigger: pinRef.current, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
        });
        requestAnimationFrame(() => ScrollTrigger.refresh());
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          gsap.set(track, { clearProps: "transform" });
          setPinned(false);
        };
      });
    });
    return () => {
      cancelled = true;
      mm?.revert();
    };
  }, [shown.length]);

  return (
    <section id="services" aria-labelledby="services-title" className="relative">
      <div ref={pinRef} className={cn("flex flex-col justify-center py-20 sm:py-24", pinned && "min-h-dvh pt-28")}>
        <div className="mx-auto flex w-full max-w-[var(--content-max)] flex-col gap-6 px-[var(--gutter)] lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading id="services-title" icon={Scissors} overline="Services" title="Pick your glow-up" accent={["glow-up"]} sub="Hair, skin, spa and grooming for everyone." align="left" />
          <p className="hidden items-center gap-2 text-caption font-semibold text-ink-neutral lg:inline-flex">
            {pinned ? "Keep scrolling" : "Swipe"} <MoveRight className="size-4" aria-hidden />
          </p>
        </div>

        {showTabs ? (
          <div className="mx-auto mt-6 w-full max-w-[var(--content-max)] px-[var(--gutter)]">
            <AnimatedTabBar items={AUDIENCE_TABS} value={tab} onChange={setTab} label="Who it's for" />
          </div>
        ) : null}

        <div ref={railRef} className={cn("mt-10", pinned ? "overflow-hidden" : "no-scrollbar snap-x snap-mandatory overflow-x-auto scroll-px-[var(--gutter)]")}>
          <ul ref={trackRef} className="flex w-max gap-4 px-[var(--gutter)] pb-4 sm:gap-5 lg:pl-[max(var(--gutter),calc((100vw_-_var(--content-max))_/_2_+_var(--gutter)))]">
            {shown.map((item, i) => (
              <ServiceCard key={item.id} item={item} index={i} />
            ))}
            <li className="grid aspect-[4/5] w-[min(76vw,20rem)] shrink-0 snap-start lg:w-[23rem]">
              <Link to={BOOK_HREF} className="group flex flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed border-portal/35 p-6 text-center transition-colors hover:border-portal hover:bg-portal/5">
                <span className="grid size-16 place-items-center rounded-full bg-portal text-portal-foreground shadow-glow transition-transform duration-500 ease-[var(--ease-spring)] group-hover:translate-x-1.5">
                  <ArrowRight className="size-7" aria-hidden />
                </span>
                <span className="font-display text-title font-bold">All services</span>
                <span className="text-caption text-ink-neutral">Prices &amp; times in the app</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
