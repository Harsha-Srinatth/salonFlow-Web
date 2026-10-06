import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';

const stats = [
  { value: 1200, suffix: '+', label: 'Happy Customers' },
  { value: 8500, suffix: '+', label: 'Appointments Completed' },
  { value: 12, suffix: '', label: 'Expert Stylists' },
  { value: 7, suffix: ' yrs', label: 'Years of Excellence' },
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(Math.floor(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <div ref={ref} className="font-display text-4xl font-bold text-foreground sm:text-5xl">
      {count.toLocaleString('en-IN')}
      {suffix}
    </div>
  );
}

export default function StatsSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary to-primary/80 p-10 shadow-2xl shadow-primary/20"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary-foreground/70">
          Our Impact
        </p>
        <h2 className="mt-2 text-center font-display text-2xl font-bold text-primary-foreground sm:text-3xl">
          Numbers That Speak for Themselves
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="text-primary-foreground">
                <Counter target={s.value} suffix={s.suffix} />
              </div>
              <p className="mt-2 text-sm font-medium text-primary-foreground/80">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
