import { CalendarPlus, CalendarX, CircleHelp, CreditCard, Footprints, Gift, MessageCircleQuestion, Plus } from "lucide-react";
import { useId, useState } from "react";
import { useBusinessInfo } from "@/lib/business-info";
import { SectionHeading } from "./section-heading";

// Each answer describes what the product actually does today. Keep them in sync with the code
// (booking window, payment flow, cancellation rules) rather than with marketing copy.
const baseFaqs = [
  {
    q: "How do I book an appointment?",
    a: "Create an account, pick your services, choose a free time today or tomorrow, and pay online to confirm. Your booking then appears under Bookings in the app.",
  },
  {
    q: "Can I walk in without a booking?",
    a: "Yes. Our reception team can check live availability and book you into the next free slot.",
  },
  {
    q: "How do I pay?",
    a: "Online bookings are paid securely when you book, using the methods shown at checkout (such as UPI and cards). At the salon, reception can also take cash or UPI for walk-ins.",
  },
  {
    q: "Do you have rewards or memberships?",
    a: "Yes. Refer friends to earn wallet credit and reward vouchers, and see Membership in the app for member offers.",
  },
];

function cancellationAnswer(rules) {
  if (!rules.length) return "You can cancel from Bookings > History in the app. The refund you will receive is shown before you confirm.";
  return `You can cancel from Bookings > History in the app: ${rules
    .map((rule) => `${rule.refund.toLowerCase()} if you cancel ${rule.when.charAt(0).toLowerCase()}${rule.when.slice(1)}`)
    .join("; ")}. The exact amount is shown before you confirm. To change the time, cancel and book again or contact the salon.`;
}

const ICONS = [
  [/cancel|refund|reschedul/i, CalendarX],
  [/walk/i, Footprints],
  [/book|appointment/i, CalendarPlus],
  [/pay|price|cost|upi|card/i, CreditCard],
  [/reward|member|refer|offer/i, Gift],
];
const iconFor = (q) => ICONS.find(([re]) => re.test(q))?.[1] ?? CircleHelp;

function FaqItem({ q, a, open, onToggle }) {
  const id = useId();
  const Icon = iconFor(q);
  return (
    <li className={`overflow-hidden rounded-card border bg-card transition-colors duration-150 ${open ? "border-portal/40" : "border-border"}`}>
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={onToggle}
          className="flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left sm:px-5"
        >
          <span className={`grid size-10 shrink-0 place-items-center rounded-xl transition-colors duration-150 ${open ? "bg-portal text-portal-foreground" : "bg-portal/12 text-ink-primary"}`}>
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="flex-1 font-semibold sm:text-[1.05rem]">{q}</span>
          <span className={`grid size-9 shrink-0 place-items-center rounded-full bg-muted transition-transform duration-150 ${open ? "rotate-45" : ""}`}>
            <Plus className="size-4" aria-hidden />
          </span>
        </button>
      </h3>
      {open ? (
        <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`}>
          <p className="px-4 pb-5 text-sm leading-relaxed text-ink-neutral sm:pr-6 sm:pl-[4.75rem]">{a}</p>
        </div>
      ) : null}
    </li>
  );
}

/** FAQ: salon's own questions (Admin → Settings) first, then the product answers. One open at a time. */
export default function FAQSection() {
  const { info } = useBusinessInfo();
  const [openIndex, setOpenIndex] = useState(0);
  const ownFaqs = (info?.profile?.faq ?? []).map((item) => ({ q: item.question, a: item.answer }));
  const faqs = [
    ...ownFaqs,
    ...baseFaqs.slice(0, 1),
    { q: "Can I cancel my booking?", a: cancellationAnswer(info?.cancellationPolicy ?? []) },
    ...baseFaqs.slice(1),
  ].filter((faq, index, all) => all.findIndex((other) => other.q.toLowerCase() === faq.q.toLowerCase()) === index);

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-16 sm:py-24">
      <div className="mx-auto grid w-full max-w-[var(--content-max)] gap-10 px-[var(--gutter)] lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading id="faq-title" icon={MessageCircleQuestion} overline="FAQ" title="Good to know" accent={["know"]} sub="Still curious? Tap Ask us anytime." align="left" />
        </div>
        <ul className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} open={openIndex === i} onToggle={() => setOpenIndex((cur) => (cur === i ? -1 : i))} />
          ))}
        </ul>
      </div>
    </section>
  );
}
