import { motion } from 'framer-motion';
import { Scissors, Sparkles, SprayCan, UserRoundCheck, Brush, Heart } from 'lucide-react';

const services = [
  {
    icon: Scissors,
    title: 'Haircut & Styling',
    description: 'Precision cuts and modern styles for all hair types, crafted by expert hands.',
    tag: 'Most Popular',
  },
  {
    icon: Sparkles,
    title: 'Facial & Skin Care',
    description: 'Rejuvenating facials and skin treatments for a bright, healthy complexion.',
    tag: null,
  },
  {
    icon: SprayCan,
    title: 'Spa & Relaxation',
    description: 'Indulge in deeply relaxing spa sessions for total stress relief and renewal.',
    tag: null,
  },
  {
    icon: UserRoundCheck,
    title: 'Beard & Grooming',
    description: 'Crisp beard shaping and luxury grooming for an impeccably sharp look.',
    tag: null,
  },
  {
    icon: Brush,
    title: 'Colour & Highlights',
    description: 'Vibrant colour treatments and dimensional highlights by certified colourists.',
    tag: 'Trending',
  },
  {
    icon: Heart,
    title: 'Bridal Packages',
    description: 'Complete beauty packages tailored for your most unforgettable day.',
    tag: null,
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function ServicesSection() {
  return (
    <section id="services" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">What We Offer</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
          Our <span className="italic">Premium</span> Services
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          From everyday grooming to special occasions — we deliver world-class care every single visit.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, i) => (
          <motion.article
            key={service.title}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow duration-300 hover:shadow-lg"
          >
            {service.tag && (
              <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {service.tag}
              </span>
            )}
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">
              <service.icon className="size-5 text-primary" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold text-card-foreground">
              {service.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{service.description}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Book this service
              <span className="translate-x-0 transition-transform duration-200 group-hover:translate-x-1">→</span>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
