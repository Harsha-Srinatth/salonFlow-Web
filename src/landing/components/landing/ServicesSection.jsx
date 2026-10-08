import { ArrowRight, ArrowUpRight, Baby, LayoutGrid, MoveRight, Scissors, User, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatedTabBar } from "@/components/kit/animated-tab-bar";
import { SectionHeading } from "./section-heading";
import { LandingPhoto } from "./LandingPhoto";
import { BOOK_HREF, SERVICE_CATEGORIES } from "./landing-data";

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
  const Icon = item.icon;
  return (
    <li className="group relative aspect-[4/5] w-[min(76vw,20rem)] shrink-0 snap-start overflow-hidden rounded-card border border-border bg-muted transition-shadow duration-200 hover:shadow-lift lg:w-[22rem]">
      {item.image ? (
        <LandingPhoto
          {...item.image}
          icon={Icon}
          sizes="(min-width: 1024px) 22rem, 76vw"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div aria-hidden className="absolute inset-0 grid place-items-center bg-muted">
          <Icon className="size-20 text-ink-neutral/40" strokeWidth={1.25} />
        </div>
      )}
      {/* Legibility scrim for the caption over the photo. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      <span aria-hidden className="absolute top-4 left-5 font-display text-sm font-bold text-white/80 tabular-nums">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span aria-hidden className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-white text-neutral-900 transition-transform duration-200 group-hover:rotate-45">
        <ArrowUpRight className="size-5" />
      </span>

      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <span className="grid size-10 place-items-center rounded-xl bg-white/20">
          <Icon className="size-5" aria-hidden />
        </span>
        <h3 className="mt-3 font-display text-title font-bold">{item.title}</h3>
        <p className="mt-1 text-caption text-white/85">{item.label}</p>
      </div>
      <Link to={BOOK_HREF} aria-label={`Book ${item.title}`} className="absolute inset-0 z-raised rounded-card" />
    </li>
  );
}

/** Services showcase: a native horizontal snap rail (no scroll hijacking). */
export default function ServicesSection({ items = SERVICE_CATEGORIES }) {
  const [tab, setTab] = useState("ALL");

  const showTabs = useMemo(() => new Set(items.flatMap(groupsOf)).size > 1, [items]);
  const shown = showTabs && tab !== "ALL" ? items.filter((item) => groupsOf(item).includes(tab)) : items;

  return (
    <section id="services" aria-labelledby="services-title" className="relative py-16 sm:py-24">
      <div className="mx-auto flex w-full max-w-[var(--content-max)] flex-col gap-6 px-[var(--gutter)] lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading id="services-title" icon={Scissors} overline="Services" title="Pick your glow-up" accent={["glow-up"]} sub="Hair, skin, spa and grooming for everyone." align="left" />
        <p className="hidden items-center gap-2 text-caption font-semibold text-ink-neutral lg:inline-flex">
          Scroll sideways <MoveRight className="size-4" aria-hidden />
        </p>
      </div>

      {showTabs ? (
        <div className="mx-auto mt-6 w-full max-w-[var(--content-max)] px-[var(--gutter)]">
          <AnimatedTabBar items={AUDIENCE_TABS} value={tab} onChange={setTab} label="Who it's for" />
        </div>
      ) : null}

      <div className="no-scrollbar mt-8 snap-x snap-mandatory overflow-x-auto scroll-px-[var(--gutter)]">
        <ul className="flex w-max gap-4 px-[var(--gutter)] pb-4 sm:gap-5 lg:pl-[max(var(--gutter),calc((100vw_-_var(--content-max))_/_2_+_var(--gutter)))]">
          {shown.map((item, i) => (
            <ServiceCard key={item.id} item={item} index={i} />
          ))}
          <li className="grid aspect-[4/5] w-[min(76vw,20rem)] shrink-0 snap-start lg:w-[22rem]">
            <Link to={BOOK_HREF} className="group flex flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed border-portal/35 p-6 text-center transition-colors hover:border-portal hover:bg-portal/5">
              <span className="grid size-14 place-items-center rounded-full bg-portal text-portal-foreground transition-transform duration-200 group-hover:translate-x-1">
                <ArrowRight className="size-6" aria-hidden />
              </span>
              <span className="font-display text-title font-bold">All services</span>
              <span className="text-caption text-ink-neutral">Prices &amp; times in the app</span>
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
