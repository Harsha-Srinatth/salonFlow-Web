import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'Regular Customer',
    review: 'Absolutely love the experience at Sahasra! The booking was seamless and my stylist knew exactly what I wanted. The salon feels premium yet so welcoming.',
    rating: 5,
    initials: 'PS',
  },
  {
    name: 'Rahul Verma',
    role: 'Monthly Member',
    review: 'I\'ve been coming here for 8 months and the consistency is remarkable. The beard shaping is impeccable and the app makes rebooking a breeze.',
    rating: 5,
    initials: 'RV',
  },
  {
    name: 'Meera Nair',
    role: 'Bridal Client',
    review: 'Chose Sahasra for my bridal package and it was the best decision. The team was professional, punctual, and made me feel like royalty.',
    rating: 5,
    initials: 'MN',
  },
  {
    name: 'Arjun Patel',
    role: 'First-time Visitor',
    review: 'Walked in on a recommendation and now I\'m a loyal customer. Fair pricing, friendly staff, and an environment that genuinely makes you feel good.',
    rating: 5,
    initials: 'AP',
  },
];

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent(c => (c === 0 ? testimonials.length - 1 : c - 1));
  const next = () => setCurrent(c => (c === testimonials.length - 1 ? 0 : c + 1));

  const t = testimonials[current];

  return (
    <section className="bg-secondary/30 py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Testimonials</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            What Our <span className="italic">Clients Say</span>
          </h2>
        </motion.div>

        <div className="mt-12">
          {/* Desktop: 3 cards */}
          <div className="hidden gap-5 md:grid md:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex">
                  {Array.from({ length: item.rating }).map((_, j) => (
                    <Star key={j} className="size-3.5 fill-accent text-accent" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">"{item.review}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {item.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mobile: carousel */}
          <div className="relative md:hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="size-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">"{t.review}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={prev}
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-all hover:bg-muted"
              >
                <ChevronLeft className="size-4" />
              </button>
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`size-2 rounded-full transition-all ${
                    i === current ? 'w-6 bg-primary' : 'bg-border'
                  }`}
                />
              ))}
              <button
                onClick={next}
                className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-all hover:bg-muted"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
