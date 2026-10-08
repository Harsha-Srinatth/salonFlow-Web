import { CalendarPlus, Crown, Gift, Sparkles, Star, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GOOGLE_RATING } from "@/lib/public-claims";
import { useMediaQuery } from "@/lib/use-media-query";
import { BUTTON_SIZES, BUTTON_VARIANTS } from "@/components/kit/button-loading-morph";
import { Rating } from "@/components/kit/rating";
import { LandingPhoto } from "./LandingPhoto";
import { BOOK_HREF, HERO_PHOTO } from "./landing-data";

const PERK_CHIPS = [
  { icon: Timer, label: "Live queue" },
  { icon: Gift, label: "Refer & earn" },
  { icon: Crown, label: "Member prices" },
];

/** Desktop visual: the salon photo with two small, static info chips. */
function HeroVisual() {
  const rating = Number(GOOGLE_RATING.value);
  return (
    <div className="relative mx-auto hidden w-full max-w-[26rem] lg:block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-muted">
        <LandingPhoto {...HERO_PHOTO} sizes="26rem" fetchPriority="high" decoding="async" className="size-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <p className="absolute right-5 bottom-5 flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles className="size-4" aria-hidden /> Your chair, your time
        </p>
      </div>
      <div className="absolute -top-5 -left-10 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lift">
        <span className="grid size-10 place-items-center rounded-xl bg-gold/15">
          <Star className="size-5 fill-gold text-gold" aria-hidden />
        </span>
        <span>
          <span className="block font-display text-xl leading-none font-bold">{rating.toFixed(1)}</span>
          <span className="text-caption text-ink-neutral">{GOOGLE_RATING.sub}</span>
        </span>
      </div>
      <div className="absolute -bottom-5 -left-10 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lift">
        <span className="grid size-10 place-items-center rounded-xl bg-portal/12 text-ink-primary">
          <Timer className="size-5" aria-hidden />
        </span>
        <span className="text-sm font-semibold">Live queue</span>
      </div>
    </div>
  );
}

/**
 * Opener: headline, one line of copy, the two calls to action and the rating. Everything is in the
 * first paint and interactive immediately; no entrance choreography, parallax or WebGL.
 */
export default function HeroSection() {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const rating = Number(GOOGLE_RATING.value);

  return (
    <section id="home" aria-labelledby="hero-title" className="relative flex min-h-[85svh] items-center pt-[calc(6rem+var(--safe-top))] pb-16 lg:min-h-[100svh]">
      <div className="mx-auto grid w-full max-w-[var(--content-max)] items-center gap-14 px-[var(--gutter)] lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-caption font-semibold">
            <Sparkles className="size-4 text-ink-primary" aria-hidden /> Unisex &amp; family salon
          </p>

          <h1 id="hero-title" className="mt-5 font-display text-display-2xl font-bold">
            Look good.
            <br />
            Feel <span className="italic text-ink-primary">confident.</span>
          </h1>

          <p className="mt-5 max-w-md text-body text-ink-neutral sm:text-lg">
            Book your chair online, watch the queue live and earn rewards for every friend you bring.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={BOOK_HREF} className={cn("inline-flex items-center justify-center font-semibold", BUTTON_VARIANTS.primary, BUTTON_SIZES.lg, "rounded-full")}>
              <CalendarPlus className="size-5" aria-hidden /> Book now
            </Link>
            <a href="#services" className={cn("inline-flex items-center justify-center font-semibold", BUTTON_VARIANTS.outline, BUTTON_SIZES.lg, "rounded-full")}>
              Explore services
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="inline-flex items-center gap-2">
              <Rating value={rating} size="sm" label="Google rating" />
              <span className="text-sm font-semibold">{GOOGLE_RATING.label}</span>
              <span className="text-caption text-ink-neutral">· {GOOGLE_RATING.sub}</span>
            </span>
            <ul className="flex flex-wrap gap-2 lg:hidden" aria-label="App perks">
              {PERK_CHIPS.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-caption font-semibold">
                  <Icon className="size-4 text-ink-primary" aria-hidden /> {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {desktop ? <HeroVisual /> : null}
      </div>
    </section>
  );
}
