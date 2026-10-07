import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { Gift, Hourglass, Share2, Ticket, UserPlus, Wallet } from "lucide-react";
import { spring, stagger } from "@/components/motion/presets";
import { LandingReferralPreview } from "@/components/kit-extra/landing-referral-preview";
import { SectionHeading } from "./section-heading";
import { SIGNUP_HREF } from "./landing-data";

/*
 * The rules as the app runs them (admin Loyalty settings + customer Refer & Earn page):
 * the friend signs up with your link, the reward is earned on their first booking, held for a
 * short check ("verifying"), then both of you get wallet credit, and each friend's first visit
 * also unlocks one free-service draw. Amounts are set by the salon, so none are shown here.
 */
const RULES = [
  { icon: Share2, title: "Share your link", sub: "Share or copy it" },
  { icon: UserPlus, title: "Friend books", sub: "They sign up and visit" },
  { icon: Hourglass, title: "Quick check", sub: "A short safety hold" },
  { icon: Wallet, title: "You both earn", sub: "Wallet credit for each" },
  { icon: Ticket, title: "Bonus draw", sub: "1 free-service draw per friend" },
];

function TiltCard({ children }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), spring.soft);
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), spring.soft);
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 40, rotate: 4 }}
      whileInView={{ opacity: 1, y: 0, rotate: -2 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={spring.gentle}
      className="relative mx-auto w-full max-w-sm"
    >
      <div aria-hidden className="absolute inset-4 translate-x-4 translate-y-4 rotate-6 rounded-card bg-gold/25" />
      <motion.div
        style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
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
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export default function ReferralSection() {
  const reduce = useReducedMotion();
  return (
    <section id="rewards" aria-labelledby="rewards-title" className="relative overflow-hidden py-20 sm:py-28">
      <div className="mx-auto grid w-full max-w-[var(--content-max)] items-center gap-14 px-[var(--gutter)] lg:grid-cols-2">
        <div>
          <SectionHeading id="rewards-title" icon={Gift} overline="Refer & earn" title="Bring a friend, both get rewarded" accent={["both"]} align="left" />
          <ol className="mt-10 grid gap-3 sm:grid-cols-2">
            {RULES.map(({ icon: Icon, title, sub }, i) => (
              <motion.li
                key={title}
                initial={reduce ? false : { opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ ...spring.soft, delay: i * stagger.base }}
                className={`flex items-center gap-3 rounded-2xl bg-card/80 p-3 pr-4 shadow-soft ring-1 ring-border/60 ${i === RULES.length - 1 ? "sm:col-span-2" : ""}`}
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${i >= 3 ? "bg-gold/15 text-gold" : "bg-portal/12 text-ink-primary"}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-caption text-ink-neutral">{sub}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </div>
        <TiltCard>
          <LandingReferralPreview to={SIGNUP_HREF} />
        </TiltCard>
      </div>
    </section>
  );
}
