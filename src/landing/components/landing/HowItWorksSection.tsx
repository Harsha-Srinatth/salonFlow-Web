import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, CalendarDays, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Choose Your Service',
    description: 'Browse our curated menu of services and pick what you need — from a quick trim to a full luxury treatment.',
  },
  {
    number: '02',
    icon: CalendarDays,
    title: 'Select a Time Slot',
    description: 'Pick a date and time that works for you. Our real-time calendar shows instant stylist availability.',
  },
  {
    number: '03',
    icon: CheckCircle2,
    title: 'Confirm & Relax',
    description: 'Get instant confirmation via SMS or WhatsApp. Walk in and we\'ll take care of everything.',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Simple Process</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
          Book in <span className="italic">3 Easy Steps</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Your perfect appointment is just three steps away — no hassle, no waiting on hold.
        </p>
      </motion.div>

      <div className="relative mt-14">
        {/* Connector line — desktop only */}
        <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

        <div className="grid gap-8 lg:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step indicator */}
              <div className="relative z-10 flex size-16 items-center justify-center rounded-2xl border-2 border-primary bg-card shadow-lg shadow-primary/10">
                <step.icon className="size-6 text-primary" />
                <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.number.replace('0', '')}
                </span>
              </div>

              <h3 className="mt-6 font-display text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mt-12 text-center"
      >
        <Link
          to="/auth/login"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-105 hover:brightness-95"
        >
          Start Booking
        </Link>
      </motion.div>
    </section>
  );
}
