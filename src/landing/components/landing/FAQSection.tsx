import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useBusinessInfo } from '@/lib/business-info';

type PolicyRule = { when: string; refund: string };
type BusinessInfo = { profile?: { faq?: { question: string; answer: string }[] }; cancellationPolicy?: PolicyRule[] };

// Each answer describes what the product actually does today. Keep them in sync with the code
// (booking window, payment flow, cancellation rules) rather than with marketing copy.
const baseFaqs = [
  {
    q: 'How do I book an appointment?',
    a: 'Create an account, pick your services, choose a free time today or tomorrow, and pay online to confirm. Your booking then appears under Bookings in the app.',
  },
  {
    q: 'Can I walk in without a booking?',
    a: 'Yes. Our reception team can check live availability and book you into the next free slot.',
  },
  {
    q: 'How do I pay?',
    a: 'Online bookings are paid securely when you book, using the methods shown at checkout (such as UPI and cards). At the salon, reception can also take cash or UPI for walk-ins.',
  },
  {
    q: 'Do you have rewards or memberships?',
    a: 'Yes. Refer friends to earn wallet credit and reward vouchers, and see Membership in the app for member offers.',
  },
];

function cancellationAnswer(rules: PolicyRule[]) {
  if (!rules.length) return 'You can cancel from Bookings > History in the app. The refund you will receive is shown before you confirm.';
  return `You can cancel from Bookings > History in the app: ${rules
    .map((rule) => `${rule.refund.toLowerCase()} if you cancel ${rule.when.charAt(0).toLowerCase()}${rule.when.slice(1)}`)
    .join('; ')}. The exact amount is shown before you confirm. To change the time, cancel and book again or contact the salon.`;
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className="overflow-hidden rounded-2xl border border-border bg-card"
      layout
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-card-foreground sm:text-base">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="size-4 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <p className="px-5 pb-4 text-sm leading-6 text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQSection() {
  const { info: rawInfo } = useBusinessInfo();
  const info = rawInfo as BusinessInfo | null;
  // The salon's own FAQ (Admin → Settings) comes first, then the product answers.
  const ownFaqs = (info?.profile?.faq ?? []).map((item) => ({ q: item.question, a: item.answer }));
  const faqs = [
    ...ownFaqs,
    ...baseFaqs.slice(0, 1),
    { q: 'Can I cancel my booking?', a: cancellationAnswer(info?.cancellationPolicy ?? []) },
    ...baseFaqs.slice(1),
  ].filter((faq, index, all) => all.findIndex((other) => other.q.toLowerCase() === faq.q.toLowerCase()) === index);
  return (
    <section id="faq" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">FAQ</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
          Frequently Asked <span className="italic">Questions</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Everything you need to know before your first visit.
        </p>
      </motion.div>

      <div className="mx-auto mt-10 max-w-3xl space-y-3">
        {faqs.map((faq, i) => (
          <motion.div
            key={faq.q}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.45 }}
          >
            <FAQItem q={faq.q} a={faq.a} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
