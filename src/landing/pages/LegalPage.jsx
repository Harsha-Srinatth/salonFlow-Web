import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarCheck, FileText, ListOrdered, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ErrorState } from "@/components/kit/error-state";
import { BrandLogo } from "@/components/kit/brand-logo";
import { LandingThemeToggle } from "@/components/kit-extra/landing-theme-toggle";
import { SkeletonShimmer, SkeletonText } from "@/components/motion/skeleton-shimmer";
import { spring } from "@/components/motion/presets";
import Footer from "@/landing/components/landing/Footer";
import { formatLegalDate, LEGAL_PAGES, parseLegalBody, useLegalDocument } from "@/lib/legal";
import { cn } from "@/lib/utils";

const ICONS = { privacy: ShieldCheck, terms: FileText };
const EMAIL = /([\w.+-]+@[\w-]+\.[\w.-]+)/g;

/** Plain text with e-mail addresses turned into mailto: links. */
function RichText({ text }) {
  return `${text}`.split(EMAIL).map((part, i) =>
    i % 2 ? (
      <a key={i} href={`mailto:${part}`} className="font-medium text-ink-primary underline underline-offset-2 break-all">
        {part}
      </a>
    ) : (
      part
    )
  );
}

function Blocks({ blocks }) {
  return blocks.map((block, i) => {
    if (block.type === "h3") return <h3 key={i} className="pt-2 font-display text-base font-semibold">{block.text}</h3>;
    if (block.type === "ul")
      return (
        <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-portal">
          {block.items.map((item, j) => (
            <li key={j}><RichText text={item} /></li>
          ))}
        </ul>
      );
    return <p key={i}><RichText text={block.text} /></p>;
  });
}

/** Highlights the section being read in the table of contents. */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0] ?? null);
  useEffect(() => {
    if (!ids.length || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    for (const id of ids) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function Contents({ sections, active, className }) {
  return (
    <ol className={cn("space-y-0.5 text-sm", className)}>
      {sections.map((section, i) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            aria-current={active === section.id ? "location" : undefined}
            className={cn(
              "flex min-h-9 items-baseline gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted",
              active === section.id ? "bg-portal/10 font-semibold text-ink-primary" : "text-ink-neutral"
            )}
          >
            <span className="w-5 shrink-0 text-right text-micro tabular-nums opacity-70">{i + 1}.</span>
            <span>{section.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * The salon's Privacy Policy or Terms & Conditions (/privacy, /terms). The text comes from the API
 * (built-in, or the version the admin saved in Settings), so the site never links out to a
 * third-party page for its own policies.
 */
export default function LegalPage({ slug }) {
  const reduce = useReducedMotion();
  const { hash } = useLocation();
  const { document: doc, status, error, reload } = useLegalDocument(slug);
  const parsed = useMemo(() => parseLegalBody(doc?.body), [doc?.body]);
  const ids = useMemo(() => parsed.sections.map((s) => s.id), [parsed]);
  const active = useActiveSection(ids);
  const other = slug === "privacy" ? "terms" : "privacy";
  const Icon = ICONS[slug];
  const title = doc?.title ?? LEGAL_PAGES[slug].title;

  useEffect(() => {
    document.title = `${title} | Sahasra Family Salon`;
  }, [title]);

  // New document: start at the top, or at the section named in the link once the text is in.
  useEffect(() => {
    if (status !== "ready") {
      window.scrollTo({ top: 0 });
      return;
    }
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, [status, hash, slug]);

  return (
    <div className="min-h-dvh bg-background">
      <a href="#legal-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 pt-[var(--safe-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-[var(--gutter)]">
          <Link to="/" aria-label="Sahasra home" className="inline-flex items-center rounded-full">
            <BrandLogo markClassName="h-9" wideClassName="h-10" />
          </Link>
          <nav aria-label="Legal" className="flex items-center gap-1">
            {Object.entries(LEGAL_PAGES).map(([key, page]) => (
              <Link
                key={key}
                to={page.path}
                aria-current={key === slug ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold transition-colors",
                  key === slug ? "bg-portal/12 text-ink-primary" : "text-ink-neutral hover:bg-muted"
                )}
              >
                <span className="sm:hidden">{key === "privacy" ? "Privacy" : "Terms"}</span>
                <span className="hidden sm:inline">{page.title}</span>
              </Link>
            ))}
            <LandingThemeToggle />
          </nav>
        </div>
      </header>

      <main id="legal-content" className="mx-auto max-w-6xl px-[var(--gutter)] pt-10 pb-16 sm:pt-14">
        <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={spring.soft} className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-micro font-bold tracking-[0.18em] text-ink-neutral uppercase">
            <Icon className="size-4 text-portal" aria-hidden /> Legal
          </p>
          <h1 className="mt-3 font-display text-display-lg font-bold text-balance">{title}</h1>
          {doc?.summary ? <p className="mt-3 text-body text-ink-neutral">{doc.summary}</p> : null}
          {doc?.effectiveDate ? (
            <p className="mt-5 inline-flex h-9 items-center gap-2 rounded-full bg-muted px-3 text-caption font-semibold">
              <CalendarCheck className="size-4 text-portal" aria-hidden /> Effective {formatLegalDate(doc.effectiveDate)}
            </p>
          ) : null}
        </motion.div>

        {status === "loading" ? (
          <div className="mt-10 max-w-3xl space-y-8" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <SkeletonShimmer className="h-6 w-1/3" />
                <SkeletonText lines={4} />
              </div>
            ))}
          </div>
        ) : status === "error" ? (
          <ErrorState className="mt-10 max-w-3xl" title={`Couldn't load the ${title}`} description={error ?? "Please try again."} onRetry={reload} />
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <details className="group rounded-card border border-border/60 bg-card p-2 shadow-soft lg:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-2 font-semibold">
                  <ListOrdered className="size-4 text-portal" aria-hidden /> On this page
                  <span className="ml-auto text-caption text-ink-neutral">{parsed.sections.length} sections</span>
                </summary>
                <Contents sections={parsed.sections} active={active} className="mt-1 pb-1" />
              </details>
              <nav aria-label="On this page" className="hidden lg:block">
                <p className="mb-2 px-2 text-micro font-bold tracking-[0.14em] text-ink-neutral uppercase">On this page</p>
                <Contents sections={parsed.sections} active={active} />
              </nav>
            </aside>

            <article className="min-w-0 max-w-3xl space-y-10 text-[15px] leading-7">
              {parsed.intro.length ? <div className="space-y-3"><Blocks blocks={parsed.intro} /></div> : null}
              {parsed.sections.map((section, i) => (
                <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-24 space-y-3">
                  <h2 id={`${section.id}-title`} className="flex items-baseline gap-3 font-display text-headline font-semibold">
                    <span className="text-caption font-bold text-portal tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    {section.title}
                  </h2>
                  <Blocks blocks={section.blocks} />
                </section>
              ))}

              <Link
                to={LEGAL_PAGES[other].path}
                className="group flex items-center justify-between gap-4 rounded-card border border-border/60 bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <span>
                  <span className="block text-micro font-bold tracking-[0.14em] text-ink-neutral uppercase">Related</span>
                  <span className="mt-1 block font-display text-lg font-semibold">{LEGAL_PAGES[other].title}</span>
                </span>
                <ArrowRight className="size-5 text-portal transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </article>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
