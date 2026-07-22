import { Scissors, Instagram, Facebook, Youtube, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const links = {
  Services: ['Haircut & Styling', 'Facial & Skin Care', 'Spa & Relaxation', 'Beard & Grooming', 'Colour & Highlights'],
  Company: ['About Us', 'Careers', 'Blog', 'Contact'],
  Support: ['FAQ', 'Cancellation Policy', 'Privacy Policy', 'Terms of Service'],
};

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Scissors className="size-4" />
              </div>
              <span className="font-display text-base font-bold text-foreground">Sahasra Saloon</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              Sahasra Unisex and Professional Family Saloon — where luxury meets care in every visit.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {[
                { Icon: Instagram, href: 'https://www.instagram.com/', label: 'Instagram' },
                { Icon: Facebook, href: 'https://www.facebook.com/', label: 'Facebook' },
                { Icon: Youtube, href: 'https://www.youtube.com/', label: 'YouTube' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground">{title}</h4>
              <ul className="mt-4 space-y-2.5">
                {items.map(item => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © 2026 Sahasra Saloon. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <a href="tel:+919000000000" className="flex items-center gap-1 hover:text-foreground">
              <Phone className="size-3" />
              +91 90000 00000
            </a>
            <a href="mailto:hello@sahasrasaloon.com" className="flex items-center gap-1 hover:text-foreground">
              <Mail className="size-3" />
              hello@sahasrasaloon.com
            </a>
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              Hyderabad, Telangana
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
