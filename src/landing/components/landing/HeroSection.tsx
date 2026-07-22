import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Star, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

const floatingCard = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay, duration: 0.5, ease: 'easeOut' },
  }),
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative mx-auto w-full max-w-7xl overflow-hidden px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-12 lg:px-8 lg:pb-28 lg:pt-16"
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-80 rounded-full bg-accent/10 blur-3xl" />

      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left content */}
        <div className="relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground shadow-sm"
          >
            <Sparkles className="size-3 text-accent" />
            Sahasra Unisex &amp; Professional Family Saloon
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            custom={0.1}
            variants={fadeUp}
            className="mt-5 font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            Look Good.{' '}
            <span className="italic text-gradient-primary">Feel</span>
            <br />
            Confident.
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            custom={0.2}
            variants={fadeUp}
            className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg"
          >
            Premium salon experience for men, women, and families. Expert stylists,
            flexible scheduling, and a luxury environment — all in one place.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.3}
            variants={fadeUp}
            className="mt-7 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              to="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-105 hover:brightness-95"
            >
              Book Appointment
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#services"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-all duration-200 hover:scale-105 hover:bg-muted"
            >
              Explore Services
            </a>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial="hidden"
            animate="visible"
            custom={0.4}
            variants={fadeUp}
            className="mt-8 flex flex-wrap items-center gap-5"
          >
            {[
              { icon: Star, text: '4.8/5 Rating', sub: '500+ reviews' },
              { icon: CheckCircle, text: 'Certified Stylists', sub: 'Expert team' },
              { icon: Calendar, text: 'Easy Booking', sub: 'In 60 seconds' },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="size-4 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{text}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — visual */}
        <div className="relative hidden lg:block">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-secondary to-muted shadow-2xl"
          >
            <img
              src="https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=600"
              alt="Premium salon interior"
              className="h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </motion.div>

          {/* Floating appointment card */}
          <motion.div
            variants={floatingCard}
            initial="hidden"
            animate="visible"
            custom={0.5}
            className="absolute -left-10 bottom-16 animate-float glass rounded-2xl px-4 py-3 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                <Calendar className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Next Appointment</p>
                <p className="text-xs text-muted-foreground">Today, 3:00 PM — Haircut</p>
              </div>
            </div>
          </motion.div>

          {/* Floating rating card */}
          <motion.div
            variants={floatingCard}
            initial="hidden"
            animate="visible"
            custom={0.65}
            className="absolute -right-6 top-12 animate-float-slow glass rounded-2xl px-4 py-3 shadow-xl"
          >
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="size-3 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-xs font-semibold text-foreground">500+ Happy Clients</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
