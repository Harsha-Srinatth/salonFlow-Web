import { motion } from 'framer-motion';

const images = [
  {
    src: 'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Facial treatment',
    tall: true,
  },
  {
    src: 'https://images.pexels.com/photos/1319460/pexels-photo-1319460.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Professional haircut',
    tall: false,
  },
  {
    src: 'https://images.pexels.com/photos/3065171/pexels-photo-3065171.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Luxury salon chair',
    tall: false,
  },
  {
    src: 'https://images.pexels.com/photos/3738673/pexels-photo-3738673.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Spa relaxation',
    tall: true,
  },
  {
    src: 'https://images.pexels.com/photos/2068975/pexels-photo-2068975.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Hair styling',
    tall: false,
  },
  {
    src: 'https://images.pexels.com/photos/1570807/pexels-photo-1570807.jpeg?auto=compress&cs=tinysrgb&w=600',
    alt: 'Beauty treatment',
    tall: false,
  },
];

export default function GallerySection() {
  return (
    <section id="gallery" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Our Work</p>
        <h2 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl">
          Style <span className="italic">Gallery</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Every visit is a work of art. See the transformations our experts create every day.
        </p>
      </motion.div>

      {/* Masonry-style grid */}
      <div className="mt-10 columns-2 gap-4 sm:columns-3">
        {images.map((img, i) => (
          <motion.div
            key={img.src}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.5 }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            className="group mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border shadow-sm"
          >
            <div className="relative overflow-hidden">
              <img
                src={img.src}
                alt={img.alt}
                className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                  img.tall ? 'aspect-[3/4]' : 'aspect-square'
                }`}
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-background/70 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="text-sm font-semibold text-white">{img.alt}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
