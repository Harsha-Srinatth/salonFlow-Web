import { motion } from 'framer-motion';
import { BadgeCheck, Clock, Star, Leaf, Users, Zap } from 'lucide-react';

const benefits = [
  {
    icon: BadgeCheck,
    title: 'Expert Professionals',
    description: 'Every stylist is certified, trained, and passionate about delivering the best results for your hair and skin.',
  },
  {
    icon: Clock,
    title: 'Flexible Scheduling',
    description: 'Book at your convenience — mornings, evenings, or weekends. Your schedule always comes first.',
  },
  {
    icon: Star,
    title: 'Premium Experience',
    description: 'Luxury-grade products, sanitized tools, and a calming ambience that makes every visit a treat.',
  },
  {
    icon: Leaf,
    title: 'Clean & Hygienic',
    description: 'Rigorous hygiene protocols with sanitized stations after every client. Your safety is paramount.',
  },
  {
    icon: Users,
    title: 'Family-Friendly',
    description: 'A welcoming, safe environment for men, women, and children of all ages.',
  },
  {
    icon: Zap,
    title: 'Smart Booking',
    description: 'Book in under 60 seconds with instant confirmation, reminders, and digital receipts.',
  },
];

export default function WhyChooseSection() {
  return (
    <section id="why" className="bg-secondary/30 py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Why Sahasra</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            The Difference is in the{' '}
            <span className="italic">Details</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            We combine expertise, technology, and warmth to create an experience worth returning to.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.55 }}
              className="flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="shrink-0">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <b.icon className="size-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-card-foreground">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{b.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
