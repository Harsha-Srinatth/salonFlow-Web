import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, BadgePercent, Crown, ShieldCheck, Sparkles, Timer, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { spring, stagger } from "@/components/motion/presets";
import { SpotlightCard } from "@/components/motion/spotlight-card";
import { SectionHeading } from "./section-heading";
import { SIGNUP_HREF } from "./landing-data";

/*
 * Membership / offers teaser. There is no public membership or offers endpoint (both live behind
 * /api/customer/*), so this names what the app really has and sends people in to see live plans
 * and prices. Each line maps to an existing customer screen.
 */
const PERKS = [
  { icon: Crown, title: "Memberships", sub: "Member prices on your visits", tone: "gold", span: "sm:col-span-2 lg:col-span-2 lg:row-span-2", big: true },
  { icon: BadgePercent, title: "Offers", sub: "Live deals in the app", tone: "primary" },
  { icon: Timer, title: "Live queue", sub: "See your wait in real time", tone: "info" },
  { icon: Wallet, title: "Wallet", sub: "Use credit at checkout", tone: "primary" },
  { icon: ShieldCheck, title: "Fair refunds", sub: "Refund shown before you cancel", tone: "success" },
];

const TONE = {
  gold: "bg-gold/15 text-gold",
  primary: "bg-portal/12 text-ink-primary",
  info: "bg-info/12 text-ink-info",
  success: "bg-success/12 text-ink-success",
};

export default function PerksSection() {
  const reduce = useReducedMotion();
  return (
    <section id="perks" aria-labelledby="perks-title" className="py-20 sm:py-28">
      <div className="mx-auto w-full max-w-[var(--content-max)] px-[var(--gutter)]">
        <SectionHeading id="perks-title" icon={Sparkles} overline="Members & offers" title="More perks, every visit" accent={["perks"]} />
        <ul className="mt-12 grid auto-rows-[minmax(9.5rem,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(({ icon: Icon, title, sub, tone, span, big }, i) => (
            <motion.li
              key={title}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ ...spring.soft, delay: Math.min(i, 5) * stagger.base }}
              className={cn("min-w-0", span)}
            >
              <SpotlightCard className={cn("flex h-full flex-col justify-between gap-6 p-6", big && "p-7 sm:p-8")}>
                {big ? (<div aria-hidden className="absolute inset-0 -z-[2]"><div className="aurora size-full" /></div>) : null}
                <span className={cn("grid place-items-center rounded-2xl", TONE[tone], big ? "size-16" : "size-12")}>
                  <Icon className={big ? "size-8" : "size-6"} aria-hidden />
                </span>
                <div>
                  <h3 className={cn("font-display font-bold", big ? "text-display-lg" : "text-headline")}>{title}</h3>
                  <p className={cn("mt-1 text-ink-neutral", big ? "text-body" : "text-sm")}>{sub}</p>
                  {big ? (
                    <Link to={SIGNUP_HREF} className="group mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background">
                      See plans <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </SpotlightCard>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
