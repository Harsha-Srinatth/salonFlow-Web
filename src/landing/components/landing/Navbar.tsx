import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Scissors, Menu, X, Sun, Moon } from 'lucide-react';
import { useAppThemeToggle } from '@/components/theme-provider';

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Why Us', href: '#why' },
  { label: 'How It Works', href: '#how' },
  { label: 'Gallery', href: '#gallery' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar() {
  const { isDark, toggleTheme } = useAppThemeToggle();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-card/95 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-110">
            <Scissors className="size-4" />
          </div>
          <span className="font-display text-base font-bold text-foreground tracking-wide">
            Sahasra
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-muted hover:text-foreground"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link
            to="/auth/login"
            className="hidden sm:inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:scale-105 hover:brightness-95"
          >
            Book Now
          </Link>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-foreground md:hidden"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-border bg-card md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {navLinks.map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="mt-1 rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-semibold text-primary-foreground"
              >
                Book Appointment
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
