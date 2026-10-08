import { CalendarPlus, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { telHref, useBusinessInfo, whatsappHref } from "@/lib/business-info";
import { BOOK_HREF } from "./landing-data";

/** Closing call to action. Call/WhatsApp only when the salon published them. */
export default function CTASection() {
  const { info } = useBusinessInfo();
  const phone = info?.profile?.phone ?? "";
  const whatsapp = info?.profile?.whatsapp ?? "";

  return (
    <section id="book" aria-labelledby="book-title" className="px-[var(--gutter)] py-12 sm:py-20">
      <div className="mx-auto w-full max-w-[var(--content-max)] rounded-[1.5rem] border border-border bg-card px-6 py-14 text-center sm:rounded-[2rem] sm:px-10 sm:py-20">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-portal text-portal-foreground">
          <CalendarPlus className="size-7" aria-hidden />
        </span>
        <h2 id="book-title" className="mx-auto mt-6 max-w-2xl font-display text-display-xl font-bold text-balance">
          Your chair is <span className="italic text-ink-primary">waiting.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-body text-ink-neutral">Pick your services and a time that suits you.</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link to={BOOK_HREF} className="inline-flex h-13 items-center gap-2.5 rounded-full bg-portal px-8 text-base font-semibold text-portal-foreground transition-opacity hover:opacity-90">
            <CalendarPlus className="size-5" aria-hidden /> Book now
          </Link>
          {phone ? (
            <a href={telHref(phone)} className="inline-flex h-13 items-center gap-2 rounded-full border border-border bg-card px-6 font-semibold transition-colors hover:bg-muted">
              <Phone className="size-5" aria-hidden /> Call
            </a>
          ) : null}
          {whatsapp ? (
            <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" className="inline-flex h-13 items-center gap-2 rounded-full border border-border bg-card px-6 font-semibold transition-colors hover:bg-muted">
              <MessageCircle className="size-5" aria-hidden /> WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
