import { ArrowUp, CalendarPlus, Clock, Facebook, Globe, Instagram, LogIn, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Youtube } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { formatAddress, telHref, useBusinessInfo, whatsappHref } from "@/lib/business-info";
import { spring } from "@/components/motion/presets";
import { NAV_LINKS, BOOK_HREF } from "./landing-data";
import { BrandMark } from "./Navbar";

// Only downloaded when someone opens the refund policy.
const MorphDialog = lazy(() => import("@/components/kit/morph-dialog").then((m) => ({ default: m.MorphDialog })));

function XLogo({ className }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIALS = [
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "youtube", label: "YouTube", Icon: Youtube },
  { key: "x", label: "X (Twitter)", Icon: XLogo },
  { key: "website", label: "Website", Icon: Globe },
];

/**
 * Development only: makes a missing business detail obvious instead of showing invented contact
 * information. In production the empty item is simply left out.
 */
function NotConfigured({ what }) {
  if (!import.meta.env.DEV) return null;
  return <span className="rounded-md border border-dashed border-warning/60 px-1.5 py-0.5 text-xs text-ink-warning">{what} not set (Admin → Settings)</span>;
}

function FooterHeading({ children }) {
  return <h3 className="text-micro font-bold tracking-[0.14em] text-ink-neutral uppercase">{children}</h3>;
}

const rowLink = "inline-flex min-h-11 items-center gap-3 rounded-xl text-sm transition-colors hover:text-ink-primary";
// Used until the admin sets privacy / terms URLs in Settings.
const LEGAL_FALLBACK = {
  privacy: "https://pixel-perfection-studio-725.lovable.app",
  terms: "https://www.privacypolicies.com/live/0e3f5c6b-1d8e-4f7c-9b2e-1f2e3c4d5e6f",
};
const legalLink = "inline-flex min-h-11 items-center rounded-lg px-3 font-medium transition-colors hover:text-ink-primary";
const iconTile = "grid size-9 shrink-0 place-items-center rounded-xl bg-portal/10 text-ink-primary";

export default function Footer() {
  const { info, status } = useBusinessInfo();
  const [policyOpen, setPolicyOpen] = useState(false);
  // Stays mounted after the first open so the dialog can play its exit animation.
  const [policyMounted, setPolicyMounted] = useState(false);
  const profile = info?.profile ?? {};
  const name = profile.businessName || "Sahasra";
  const address = formatAddress(profile);
  const socials = SOCIALS.filter(({ key }) => profile[key]);
  const year = new Date().getFullYear();
  const hasContact = Boolean(profile.phone || profile.whatsapp || profile.supportEmail);
  const policy = info?.cancellationPolicy ?? [];

  return (
    <footer className="relative overflow-hidden border-t border-border/70 bg-card pb-[calc(6rem+var(--safe-bottom))] md:pb-[calc(2rem+var(--safe-bottom))]" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        {name} contact and links
      </h2>
      <div className="mx-auto w-full max-w-[var(--content-max)] px-[var(--gutter)] pt-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link to="/" aria-label={`${name} home`} className="inline-flex rounded-full">
              <BrandMark />
            </Link>
            <p className="mt-4 max-w-xs text-sm text-ink-neutral">{profile.tagline || profile.about?.slice(0, 160) || "Book salon visits online, see live wait times and earn rewards."}</p>
            {socials.length ? (
              <ul className="mt-5 flex flex-wrap items-center gap-2" aria-label="Social media">
                {socials.map(({ key, label, Icon }) => (
                  <li key={key}>
                    <a
                      href={profile[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${name} on ${label}`}
                      className="grid size-11 place-items-center rounded-full border border-border bg-background text-foreground transition-[transform,background-color,color] duration-300 ease-[var(--ease-spring)] hover:-translate-y-1 hover:bg-portal hover:text-portal-foreground"
                    >
                      <Icon className="size-4.5" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : status === "ready" ? (
              <div className="mt-4">
                <NotConfigured what="Social links" />
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-3">
            <FooterHeading>Contact</FooterHeading>
            <ul className="mt-3 space-y-1">
              {status === "loading" ? <li className="kit-shimmer h-24 rounded-xl" aria-hidden="true" /> : null}
              {profile.phone ? (
                <li>
                  <a href={telHref(profile.phone)} className={rowLink}>
                    <span className={iconTile}>
                      <Phone className="size-4" aria-hidden />
                    </span>
                    {profile.phone}
                  </a>
                </li>
              ) : null}
              {profile.whatsapp ? (
                <li>
                  <a href={whatsappHref(profile.whatsapp)} target="_blank" rel="noopener noreferrer" className={rowLink}>
                    <span className={iconTile}>
                      <MessageCircle className="size-4" aria-hidden />
                    </span>
                    WhatsApp {profile.whatsapp}
                  </a>
                </li>
              ) : null}
              {profile.supportEmail ? (
                <li>
                  <a href={`mailto:${profile.supportEmail}`} className={`${rowLink} break-all`}>
                    <span className={iconTile}>
                      <Mail className="size-4" aria-hidden />
                    </span>
                    {profile.supportEmail}
                  </a>
                </li>
              ) : null}
              {status === "ready" && !hasContact ? (
                <li>
                  <NotConfigured what="Phone / support email" />
                </li>
              ) : null}
              {status === "error" ? <li className="text-sm text-ink-neutral">Contact details are unavailable right now.</li> : null}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <FooterHeading>Visit</FooterHeading>
            <ul className="mt-3 space-y-3 text-sm">
              {address ? (
                <li className="flex gap-3">
                  <span className={iconTile}>
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  <span className="pt-1.5">
                    {address}
                    {profile.mapsUrl ? (
                      <a href={profile.mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex min-h-11 items-center font-semibold text-ink-primary underline-offset-2 hover:underline">
                        Get directions
                      </a>
                    ) : null}
                  </span>
                </li>
              ) : status === "ready" ? (
                <li>
                  <NotConfigured what="Address" />
                </li>
              ) : null}
              {info?.hours ? (
                <li className="flex gap-3">
                  <span className={iconTile}>
                    <Clock className="size-4" aria-hidden />
                  </span>
                  <span className="pt-1.5">
                    {info.hours.days}, {info.hours.opens} – {info.hours.closes}
                    {info.hours.lunchBreak ? (
                      <span className="block text-caption text-ink-neutral">
                        Lunch break {info.hours.lunchBreak.from} – {info.hours.lunchBreak.to}
                      </span>
                    ) : null}
                  </span>
                </li>
              ) : null}
            </ul>
          </div>

          <nav className="lg:col-span-2" aria-label="Footer">
            <FooterHeading>Explore</FooterHeading>
            <ul className="mt-3">
              {NAV_LINKS.map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} className={rowLink}>
                    {label}
                  </a>
                </li>
              ))}
              <li>
                <Link to={BOOK_HREF} className={rowLink}>
                  <CalendarPlus className="size-4" aria-hidden /> Book
                </Link>
              </li>
              <li>
                <Link to="/auth/login" className={rowLink}>
                  <LogIn className="size-4" aria-hidden /> Sign in
                </Link>
              </li>
              {policy.length ? (
                <li>
                  <button type="button" onClick={() => {
                      setPolicyMounted(true);
                      setPolicyOpen(true);
                    }} className={`${rowLink} text-left`}>
                    <ShieldCheck className="size-4" aria-hidden /> Refunds
                  </button>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>

        <div className="mt-12 grid items-center gap-x-6 gap-y-2 border-t border-border/70 pt-4 text-caption text-ink-neutral sm:grid-cols-[1fr_auto_1fr]">
          <p className="text-center sm:text-left">
            © {year} {name}. All rights reserved.
          </p>
          <nav aria-label="Legal" className="flex items-center justify-center gap-1">
            <a href={profile.privacyUrl || LEGAL_FALLBACK.privacy} target="_blank" rel="noopener noreferrer" className={legalLink}>
              Privacy Policy
            </a>
            <span aria-hidden className="h-4 w-px bg-border" />
            <a href={profile.termsUrl || LEGAL_FALLBACK.terms} target="_blank" rel="noopener noreferrer" className={legalLink}>
              Terms of Service
            </a>
          </nav>
          <button type="button" onClick={() => window.scrollTo({ top: 0 })} className="inline-flex h-11 items-center gap-2 justify-self-center rounded-full px-4 font-semibold text-foreground transition-colors hover:bg-muted sm:justify-self-end">
            <ArrowUp className="size-4" aria-hidden /> Top
          </button>
        </div>
      </div>

      {policyMounted ? (
        <Suspense fallback={null}>
          <MorphDialog open={policyOpen} onOpenChange={setPolicyOpen} title="Cancellation & refunds" description="Refunds depend on how early you cancel." icon={ShieldCheck}>
            <ul className="space-y-2">
              {policy.map((rule) => (
                <li key={rule.when} className="rounded-2xl bg-secondary p-3 text-sm">
                  <p className="font-semibold">
                    {rule.refund} <span className="font-normal text-ink-neutral">· {rule.when}</span>
                  </p>
                  {rule.detail ? <p className="mt-1 text-ink-neutral">{rule.detail}</p> : null}
                </li>
              ))}
            </ul>
          </MorphDialog>
        </Suspense>
      ) : null}
    </footer>
  );
}
