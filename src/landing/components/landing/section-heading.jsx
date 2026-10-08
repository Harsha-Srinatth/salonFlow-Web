import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring, stagger } from "@/components/motion/presets";

/**
 * Words rise out of a mask one after another the first time they scroll into view.
 * `accent` words (matched case-insensitively, punctuation ignored) get the portal gradient + italics.
 */
export function RevealText({ text, accent = [], as: Tag = "span", className, delay = 0, immediate = false, id }) {
  const reduce = useReducedMotion();
  const norm = (w) => w.toLowerCase().replace(/[^a-z]/g, "");
  const accents = new Set(accent.map(norm));
  const words = text.split(" ");
  const trigger = immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true, amount: 0.6 } };
  return (
    <Tag id={id} className={className}>
      <span className="sr-only">{text}</span>
      <motion.span aria-hidden initial={reduce ? false : "hidden"} {...trigger} variants={{ hidden: {}, show: { transition: { staggerChildren: stagger.loose, delayChildren: delay } } }} className="inline">
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span
              className={cn("inline-block", accents.has(norm(word)) && "pr-[0.08em] italic text-gradient-portal")}
              variants={{ hidden: { y: "110%", rotate: 4 }, show: { y: "0%", rotate: 0, transition: spring.gentle } }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/** Section header: icon overline, big animated title, optional one-line sub. */
export function SectionHeading({ icon: Icon, overline, title, accent, sub, align = "center", className, id }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("flex flex-col gap-3", align === "center" ? "items-center text-center" : "items-start text-left", className)}>
      <motion.p
        initial={reduce ? false : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={spring.soft}
        className="inline-flex h-8 items-center gap-2 rounded-full bg-portal/10 px-3 text-micro font-bold tracking-[0.14em] text-ink-primary uppercase"
      >
        {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
        {overline}
      </motion.p>
      <RevealText id={id} as="h2" text={title} accent={accent} className="max-w-3xl font-display text-display-lg font-bold text-balance" />
      {sub ? (
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="max-w-md text-body text-ink-neutral"
        >
          {sub}
        </motion.p>
      ) : null}
    </div>
  );
}
