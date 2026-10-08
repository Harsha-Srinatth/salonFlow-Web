import { cn } from "@/lib/utils";

/**
 * Headline text. `accent` words (matched case-insensitively, punctuation ignored) are set in the
 * accent colour and italics. Static: no per-word reveal.
 */
export function RevealText({ text, accent = [], as: Tag = "span", className, id }) {
  const norm = (w) => w.toLowerCase().replace(/[^a-z]/g, "");
  const accents = new Set(accent.map(norm));
  const words = text.split(" ");
  return (
    <Tag id={id} className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`}>
          {accents.has(norm(word)) ? <span className="pr-[0.08em] italic text-ink-primary">{word}</span> : word}
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}

/** Section header: icon overline, title, optional one-line sub. */
export function SectionHeading({ icon: Icon, overline, title, accent, sub, align = "center", className, id }) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" ? "items-center text-center" : "items-start text-left", className)}>
      <p className="inline-flex h-8 items-center gap-2 rounded-full bg-portal/10 px-3 text-micro font-bold tracking-[0.14em] text-ink-primary uppercase">
        {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
        {overline}
      </p>
      <RevealText id={id} as="h2" text={title} accent={accent} className="max-w-3xl font-display text-display-lg font-bold text-balance" />
      {sub ? <p className="max-w-md text-body text-ink-neutral">{sub}</p> : null}
    </div>
  );
}
