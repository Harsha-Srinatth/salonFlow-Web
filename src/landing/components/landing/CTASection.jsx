import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { CalendarPlus, MessageCircle, Phone } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { telHref, useBusinessInfo, whatsappHref } from "@/lib/business-info";
import { spring } from "@/components/motion/presets";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { AuroraBackground } from "@/components/kit/aurora-background";
import { RevealText } from "./section-heading";
import { BOOK_HREF } from "./landing-data";

/** Closing call to action: the card scales up into place as it scrolls in. Call/WhatsApp only when the salon published them. */
export default function CTASection() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { info } = useBusinessInfo();
  const phone = info?.profile?.phone ?? "";
  const whatsapp = info?.profile?.whatsapp ?? "";
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.9, 1]);

  return (
    <section ref={ref} id="book" aria-labelledby="book-title" className="px-[var(--gutter)] py-12 sm:py-20">
      <motion.div style={{ scale }} className="relative isolate mx-auto w-full max-w-[var(--content-max)] overflow-hidden rounded-[2rem] border border-border/60 bg-card px-6 py-16 text-center shadow-float sm:rounded-[2.5rem] sm:px-10 sm:py-24">
        <AuroraBackground animated grain />
        <motion.span
          initial={reduce ? false : { scale: 0, rotate: -30 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={spring.bouncy}
          className="mx-auto grid size-16 place-items-center rounded-3xl bg-portal text-portal-foreground shadow-glow"
        >
          <CalendarPlus className="size-8" aria-hidden />
        </motion.span>
        <RevealText as="h2" id="book-title" text="Your chair is waiting." accent={["waiting"]} className="mx-auto mt-6 block max-w-2xl font-display text-display-xl font-bold text-balance" />
        <p className="mx-auto mt-4 max-w-sm text-body text-ink-neutral">Pick your services and a time that suits you.</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <MagneticButton strength={0.45}>
            <Link to={BOOK_HREF} data-cursor className="shine shine-auto inline-flex h-14 items-center gap-2.5 rounded-full bg-portal px-8 text-base font-semibold text-portal-foreground shadow-glow">
              <CalendarPlus className="size-5" aria-hidden /> Book now
            </Link>
          </MagneticButton>
          {phone ? (
            <a href={telHref(phone)} className={cn("inline-flex h-14 items-center gap-2 rounded-full border border-border bg-card/70 px-6 font-semibold transition-colors hover:bg-muted")}>
              <Phone className="size-5" aria-hidden /> Call
            </a>
          ) : null}
          {whatsapp ? (
            <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex h-14 items-center gap-2 rounded-full border border-border bg-card/70 px-6 font-semibold transition-colors hover:bg-muted">
              <MessageCircle className="size-5" aria-hidden /> WhatsApp
            </a>
          ) : null}
        </div>
      </motion.div>
    </section>
  );
}
