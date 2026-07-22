import { motion } from 'framer-motion';
import { CalendarDays, Users, Bell, Star, UserCircle, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: CalendarDays,
    title: 'Smart Appointment Booking',
    description: 'Real-time slot availability, instant confirmation, and automatic reminders.',
    color: 'bg-blue-500/10 text-blue-500 dark:text-blue-400',
  },
  {
    icon: Users,
    title: 'Staff Management',
    description: 'Track stylist schedules, workload, and performance from one dashboard.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'WhatsApp and SMS alerts for bookings, reminders, and exclusive offers.',
    color: 'bg-accent/10 text-accent',
  },
  {
    icon: Star,
    title: 'Loyalty & Rewards',
    description: 'Points-based loyalty system that keeps customers coming back.',
    color: 'bg-yellow-500/10 text-yellow-500 dark:text-yellow-400',
  },
  {
    icon: UserCircle,
    title: 'Customer Profiles',
    description: 'Complete history, preferences, and personalized recommendations per customer.',
    color: 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
  },
  {
    icon: BarChart3,
    title: 'Revenue Analytics',
    description: 'Live dashboard with revenue, peak hours, and repeat customer metrics.',
    color: 'bg-teal-500/10 text-teal-500 dark:text-teal-400',
  },
];

export default function FeaturesSection() {
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
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Platform Power</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
            Everything You Need to{' '}
            <span className="italic">Run Your Salon</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            A complete operating system for modern salon businesses — from booking to billing.
          </p>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        >
          {/* Mock header bar */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div className="size-3 rounded-full bg-error/60" />
            <div className="size-3 rounded-full bg-warning/60" />
            <div className="size-3 rounded-full bg-success/60" />
            <div className="mx-auto h-5 w-40 rounded-full bg-muted text-xs" />
          </div>
          {/* Mock stats row */}
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            {[
              { label: 'Today\'s Bookings', val: '24', delta: '+4' },
              { label: 'Revenue', val: '₹12,450', delta: '+12%' },
              { label: 'Queue Time', val: '18 min', delta: '-3m' },
              { label: 'Satisfaction', val: '4.9/5', delta: '+0.1' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 font-display text-lg font-bold text-foreground">{s.val}</p>
                <p className="text-xs font-medium text-success">{s.delta}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className={`shrink-0 flex size-10 items-center justify-center rounded-xl ${f.color.replace(' text-', ' ').split(' ')[0]}`}>
                <f.icon className={`size-5 ${f.color.split(' ').slice(1).join(' ')}`} />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-card-foreground">{f.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{f.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
