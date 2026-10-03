import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Facebook, Globe, Instagram, Mail, MapPin, MessageCircle, Phone, Scissors, ShieldCheck, Youtube } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatAddress, telHref, useBusinessInfo, whatsappHref } from '@/lib/business-info';

type PolicyRule = { when: string; refund: string; detail: string };
type BusinessInfo = {
  profile?: Record<string, string>;
  hours?: { days: string; opens: string; closes: string; lunchBreak: { from: string; to: string } };
  cancellationPolicy?: PolicyRule[];
};

const exploreLinks = [
  { label: 'Services', href: '#services' },
  { label: 'How it works', href: '#how' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'FAQ', href: '#faq' },
];

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'x', label: 'X (Twitter)', Icon: XLogo },
  { key: 'website', label: 'Website', Icon: Globe },
] as const;

/**
 * Development only: makes a missing business detail obvious instead of showing invented contact
 * information. In production the empty item is simply left out.
 */
function NotConfigured({ what }: { what: string }) {
  if (!import.meta.env.DEV) return null;
  return (
    <span className="rounded-md border border-dashed border-amber-500/60 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-400">
      {what} not set (Admin → Settings)
    </span>
  );
}

function FooterHeading({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">{children}</h3>;
}

const linkClass = 'text-sm text-muted-foreground transition-colors hover:text-foreground';

export default function Footer() {
  const { info: rawInfo, status } = useBusinessInfo();
  const info = rawInfo as BusinessInfo | null;
  const [policyOpen, setPolicyOpen] = useState(false);
  const profile: Record<string, string> = info?.profile ?? {};
  const name = profile.businessName || 'Sahasra';
  const address = formatAddress(profile);
  const socials = SOCIALS.filter(({ key }) => profile[key]);
  const year = new Date().getFullYear();
  const hasContact = Boolean(profile.phone || profile.whatsapp || profile.supportEmail);
  const policy: PolicyRule[] = info?.cancellationPolicy ?? [];

  return (
    <footer className="border-t border-border bg-card" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        {name} contact and links
      </h2>
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scissors className="size-4" />
              </div>
              <span className="font-display text-base font-bold text-foreground">{name}</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              {profile.tagline || profile.about?.slice(0, 160) || 'Book salon services online, see live wait times and manage your visits in one place.'}
            </p>
            {socials.length ? (
              <ul className="mt-5 flex items-center gap-3" aria-label="Social media">
                {socials.map(({ key, label, Icon }) => (
                  <li key={key}>
                    <a
                      href={profile[key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${name} on ${label}`}
                      className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground"
                    >
                      <Icon className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : status === 'ready' ? (
              <div className="mt-4">
                <NotConfigured what="Social links" />
              </div>
            ) : null}
          </div>

          {/* Contact */}
          <div className="lg:col-span-3">
            <FooterHeading>Contact</FooterHeading>
            <ul className="mt-4 space-y-3 text-sm">
              {status === 'loading' ? <li className="h-16 animate-pulse rounded-lg bg-muted" aria-hidden="true" /> : null}
              {profile.phone ? (
                <li>
                  <a href={telHref(profile.phone)} className={`${linkClass} flex items-center gap-2`}>
                    <Phone className="size-4 shrink-0" /> {profile.phone}
                  </a>
                </li>
              ) : null}
              {profile.whatsapp ? (
                <li>
                  <a href={whatsappHref(profile.whatsapp)} target="_blank" rel="noopener noreferrer" className={`${linkClass} flex items-center gap-2`}>
                    <MessageCircle className="size-4 shrink-0" /> WhatsApp {profile.whatsapp}
                  </a>
                </li>
              ) : null}
              {profile.supportEmail ? (
                <li>
                  <a href={`mailto:${profile.supportEmail}`} className={`${linkClass} flex items-center gap-2 break-all`}>
                    <Mail className="size-4 shrink-0" /> {profile.supportEmail}
                  </a>
                </li>
              ) : null}
              {status === 'ready' && !hasContact ? (
                <li>
                  <NotConfigured what="Phone / support email" />
                </li>
              ) : null}
              {status === 'error' ? <li className="text-muted-foreground">Contact details are unavailable right now.</li> : null}
            </ul>
          </div>

          {/* Visit */}
          <div className="lg:col-span-3">
            <FooterHeading>Visit us</FooterHeading>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {address ? (
                <li className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {address}
                    {profile.mapsUrl ? (
                      <a
                        href={profile.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Get directions
                      </a>
                    ) : null}
                  </span>
                </li>
              ) : status === 'ready' ? (
                <li>
                  <NotConfigured what="Address" />
                </li>
              ) : null}
              {info?.hours ? (
                <li className="flex gap-2">
                  <Clock className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {info.hours.days}, {info.hours.opens} – {info.hours.closes}
                    <span className="block text-xs">
                      Lunch break {info.hours.lunchBreak.from} – {info.hours.lunchBreak.to}
                    </span>
                  </span>
                </li>
              ) : null}
            </ul>
          </div>

          {/* Links */}
          <nav className="lg:col-span-2" aria-label="Footer">
            <FooterHeading>Explore</FooterHeading>
            <ul className="mt-4 space-y-2.5">
              {exploreLinks.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={linkClass}>
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/auth/signup" className={linkClass}>
                  Book an appointment
                </Link>
              </li>
              <li>
                <Link to="/auth/login" className={linkClass}>
                  Sign in
                </Link>
              </li>
              {policy.length ? (
                <li>
                  <button type="button" onClick={() => setPolicyOpen(true)} className={`${linkClass} text-left`}>
                    Cancellation &amp; refunds
                  </button>
                </li>
              ) : null}
              {profile.privacyUrl ? (
                <li>
                  <a href={profile.privacyUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Privacy policy
                  </a>
                </li>
              ) : null}
              {profile.termsUrl ? (
                <li>
                  <a href={profile.termsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Terms of service
                  </a>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {name}. All rights reserved.
          </p>
          {status === 'ready' && (!profile.privacyUrl || !profile.termsUrl) ? <NotConfigured what="Privacy / terms links" /> : null}
        </div>
      </div>

      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader className="">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" /> Cancellation &amp; refunds
            </DialogTitle>
            <DialogDescription className="">Refunds depend on how long before your appointment you cancel.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-3">
            {policy.map((rule) => (
              <li key={rule.when} className="rounded-xl bg-secondary p-3 text-sm">
                <p className="font-semibold">
                  {rule.refund} <span className="font-normal text-muted-foreground">· {rule.when}</span>
                </p>
                <p className="mt-1 text-muted-foreground">{rule.detail}</p>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </footer>
  );
}
