import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'How do I book an appointment?',
    a: 'Simply tap "Book Appointment", choose your service, select an available time slot, and confirm. You\'ll receive instant confirmation via WhatsApp or SMS.',
  },
  {
    q: 'Can I walk in without a booking?',
    a: 'Yes! Walk-ins are always welcome. Our receptionist will check live availability and assign you to the next available stylist.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept cash, UPI, credit/debit cards, and all major digital wallets. Digital receipts are sent automatically after each visit.',
  },
  {
    q: 'How does the loyalty program work?',
    a: 'Every service earns you points. Accumulate enough and redeem them for free services, discounts, or exclusive treatments.',
  },
  {
    q: 'Can I cancel or reschedule my booking?',
    a: 'Absolutely. You can cancel or reschedule up to 2 hours before your appointment through the app at no charge.',
  },
  {
    q: 'Do you offer packages for families?',
    a: 'Yes, we have family packages and membership plans that offer great value for regular visitors. Ask our receptionist for details.',
  },
];

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
