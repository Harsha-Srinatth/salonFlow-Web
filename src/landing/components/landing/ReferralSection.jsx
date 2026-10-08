import { Gift, Hourglass, Share2, Ticket, UserPlus, Wallet } from "lucide-react";
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

export default function ReferralSection() {
  return (
    <section id="rewards" aria-labelledby="rewards-title" className="relative overflow-hidden py-16 sm:py-24">
      <div className="mx-auto grid w-full max-w-[var(--content-max)] items-center gap-14 px-[var(--gutter)] lg:grid-cols-2">
        <div>
          <SectionHeading id="rewards-title" icon={Gift} overline="Refer & earn" title="Bring a friend, both get rewarded" accent={["both"]} align="left" />
          <ol className="mt-10 grid gap-3 sm:grid-cols-2">
            {RULES.map(({ icon: Icon, title, sub }, i) => (
              <li
                key={title}
                className={`flex items-center gap-3 rounded-xl border border-border bg-card p-3 pr-4 ${i === RULES.length - 1 ? "sm:col-span-2" : ""}`}
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${i >= 3 ? "bg-gold/15 text-gold" : "bg-portal/12 text-ink-primary"}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">{title}</span>
                  <span className="block text-caption text-ink-neutral">{sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <LandingReferralPreview to={SIGNUP_HREF} />
        </div>
      </div>
    </section>
  );
}
