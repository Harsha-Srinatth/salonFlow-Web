import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { telHref, useBusinessInfo } from '@/lib/business-info';

export default function CTASection() {
  const { info } = useBusinessInfo();
  const phone: string = (info as { profile?: { phone?: string } } | null)?.profile?.phone ?? '';
  return (
    <section id="book" className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 px-6 py-14 text-center shadow-2xl shadow-primary/30 sm:px-10 sm:py-16"
        >
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 size-48 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground">
              <Sparkles className="size-3" />
              Book Today
            </div>
            <h2 className="font-display text-3xl font-bold text-primary-foreground sm:text-4xl lg:text-5xl">
              Your Best Look is{' '}
              <span className="italic">One Tap Away</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-primary-foreground/80 sm:text-base">
              Walk in confident, walk out transformed. Book your appointment now and experience
              the Sahasra difference firsthand.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-primary shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
              >
                Book Appointment
                <ArrowRight className="size-4" />
              </Link>
              {/* Only when the salon has published a number (Admin → Settings); never a placeholder. */}
              {phone ? (
                <a
                  href={telHref(phone)}
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:scale-105 hover:bg-white/10"
                >
                  Call Us Now
                </a>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
