import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowDown, CalendarPlus, Gift, Sparkles, Star, Timer, Crown } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { GOOGLE_RATING } from "@/lib/public-claims";
import { useMediaQuery } from "@/lib/use-media-query";
import { spring, variants } from "@/components/motion/presets";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { AuroraBackground } from "@/components/kit/aurora-background";
import { BUTTON_SIZES, BUTTON_VARIANTS } from "@/components/kit/button-loading-morph";
import { Rating } from "@/components/kit/rating";
import { RevealText } from "./section-heading";
import { LandingPhoto } from "./LandingPhoto";
import { BOOK_HREF, HERO_PHOTO } from "./landing-data";

const PERK_CHIPS = [
  { icon: Timer, label: "Live queue" },
  { icon: Gift, label: "Refer & earn" },
  { icon: Crown, label: "Member prices" },
];

/** Glass/solid chip that bobs gently (transform only; still for reduced motion). */
function FloatingChip({ className, delay = 0, children, glass = false }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.8, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ ...spring.bouncy, delay: 0.6 + delay }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 4 + delay * 2, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
        className={cn("flex items-center gap-3 rounded-2xl px-4 py-3", glass ? "glass-surface" : "border border-border/70 bg-card shadow-lift")}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Desktop visual: photo card with pointer tilt + scroll parallax, an orbiting ring and floating chips. */
function HeroVisual({ y }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-7, 7]), spring.soft);
  const rotateX = useSpring(useTransform(py, [0, 1], [6, -6]), spring.soft);
  const rating = Number(GOOGLE_RATING.value);

  return (
    <motion.div style={{ y }} className="relative hidden lg:block">
      <motion.div
        style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 1200 }}
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
        className="relative mx-auto w-full max-w-[26rem]"
      >
        <motion.div
          aria-hidden
          className="absolute -inset-8 rounded-full border-2 border-dashed border-portal/25"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.92, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ ...spring.gentle, delay: 0.15 }}
          className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-muted shadow-float"
        >
          <LandingPhoto
            {...HERO_PHOTO}
            sizes="26rem"
            fetchPriority="high"
            decoding="async"
            initial={reduce ? false : { scale: 1.18 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            className="size-full object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[hsl(222_40%_8%/0.55)] via-transparent to-transparent" />
          <p className="absolute right-5 bottom-5 flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="size-4" aria-hidden /> Your chair, your time
          </p>
        </motion.div>

        <FloatingChip glass className="-top-6 -left-14" delay={0}>
          <span className="grid size-10 place-items-center rounded-xl bg-gold/15">
            <Star className="size-5 fill-gold text-gold" aria-hidden />
          </span>
          <span>
            <span className="block font-display text-xl leading-none font-bold">{rating.toFixed(1)}</span>
            <span className="text-caption text-ink-neutral">{GOOGLE_RATING.sub}</span>
          </span>
        </FloatingChip>
        <FloatingChip className="top-1/2 -right-16" delay={0.25}>
          <span className="grid size-10 place-items-center rounded-xl bg-portal/12 text-ink-primary">
            <Timer className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold">Live queue</span>
        </FloatingChip>
        <FloatingChip className="-bottom-6 -left-10" delay={0.5}>
          <span className="grid size-10 place-items-center rounded-xl bg-gold/15 text-gold">
            <Gift className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold">Refer &amp; earn</span>
        </FloatingChip>
      </motion.div>
    </motion.div>
  );
}

/**
 * Cinematic opener: WebGL/CSS aurora, parallax layers, a masked headline reveal and a magnetic
 * Book button. As you scroll away the copy recedes (scale + fade) while the visual drifts up.
 */
export default function HeroSection() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const still = reduce ? 0 : 1;
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 140 * still]);
  const copyScale = useTransform(scrollYProgress, [0, 1], [1, 1 - 0.08 * still]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const farY = useTransform(scrollYProgress, [0, 1], [0, -80 * still]);
  const nearY = useTransform(scrollYProgress, [0, 1], [0, -260 * still]);
  const visualY = useTransform(scrollYProgress, [0, 1], [0, -160 * still]);
  const rating = Number(GOOGLE_RATING.value);

  return (
    <section ref={ref} id="home" aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-[calc(6.5rem+var(--safe-top))] pb-20">
      <AuroraBackground webgl animated grain />
      <motion.div aria-hidden style={{ y: farY }} className="absolute top-28 -left-24 -z-[1] size-80 rounded-blob bg-portal/15 blur-3xl" />
      <motion.div aria-hidden style={{ y: nearY }} className="absolute top-[22%] right-[6%] -z-[1] hidden size-44 rounded-full border border-portal/25 md:block" />
      <motion.div aria-hidden style={{ y: nearY }} className="absolute bottom-[18%] left-[44%] -z-[1] size-3 rounded-full bg-gold/80" />
      <motion.div aria-hidden style={{ y: farY }} className="absolute right-[30%] bottom-[8%] -z-[1] size-56 rounded-blob bg-accent/10 blur-3xl" />

      <div className="mx-auto grid w-full max-w-[var(--content-max)] items-center gap-14 px-[var(--gutter)] lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div style={{ y: copyY, scale: copyScale, opacity: copyOpacity }} className="origin-top-left">
          <motion.p
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={variants.fadeUp}
            className="glass-surface inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-caption font-semibold"
          >
            <Sparkles className="size-4 text-ink-primary" aria-hidden /> Unisex &amp; family salon
          </motion.p>

          <h1 id="hero-title" className="mt-5 font-display text-display-2xl font-bold">
            <RevealText immediate text="Look good." delay={0.1} />
            <br />
            <RevealText immediate text="Feel confident." accent={["confident"]} delay={0.35} />
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.soft, delay: 0.7 }}
            className="mt-5 max-w-md text-body text-ink-neutral sm:text-lg"
          >
            Book your chair online, watch the queue live and earn rewards for every friend you bring.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.soft, delay: 0.85 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <MagneticButton strength={0.4}>
              <Link to={BOOK_HREF} data-cursor className={cn("shine shine-auto inline-flex items-center justify-center rounded-full font-semibold", BUTTON_VARIANTS.primary, BUTTON_SIZES.lg, "rounded-full shadow-glow")}>
                <CalendarPlus className="size-5" aria-hidden /> Book now
              </Link>
            </MagneticButton>
            <a href="#services" className={cn("inline-flex items-center justify-center font-semibold", BUTTON_VARIANTS.outline, BUTTON_SIZES.lg, "rounded-full")}>
              Explore services
            </a>
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.05 }}
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3"
          >
            <span className="inline-flex items-center gap-2">
              <Rating value={rating} size="sm" label="Google rating" />
              <span className="text-sm font-semibold">{GOOGLE_RATING.label}</span>
              <span className="text-caption text-ink-neutral">· {GOOGLE_RATING.sub}</span>
            </span>
            <ul className="flex flex-wrap gap-2 lg:hidden" aria-label="App perks">
              {PERK_CHIPS.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-card/70 px-3 text-caption font-semibold shadow-soft">
                  <Icon className="size-4 text-ink-primary" aria-hidden /> {label}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        {desktop ? <HeroVisual y={visualY} /> : null}
      </div>

      <a href="#services" aria-label="Scroll to services" className="absolute bottom-[calc(1rem+var(--safe-bottom))] left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-micro font-semibold tracking-[0.16em] text-ink-neutral uppercase md:flex">
        <span className="grid h-10 w-6 justify-center rounded-full border-2 border-current pt-1.5">
          <span className="landing-cue block size-1.5 rounded-full bg-current" />
        </span>
        <ArrowDown className="size-3.5" aria-hidden />
      </a>
    </section>
  );
}
