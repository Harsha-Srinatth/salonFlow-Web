import { Link } from "react-router-dom"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { Clock, Gift, Home, Moon, Scissors, Sparkles, Sun } from "lucide-react"
import { useAppThemeToggle } from "@/components/theme-provider"

const HEADER_TAGLINES = [
  { icon: Sparkles, text: "Premium salon care for everyone" },
  { icon: Clock, text: "Book your visit in under a minute" },
  { icon: Gift, text: "Earn rewards on every visit" },
]

/** Rotating one-line highlights so the header is never just a logo and a toggle. */
function HeaderTagline() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined
    const id = window.setInterval(() => setIndex(value => (value + 1) % HEADER_TAGLINES.length), 3200)
    return () => window.clearInterval(id)
  }, [])
  const { icon: Icon, text } = HEADER_TAGLINES[index]
  return (
    <div className="hidden h-9 items-center overflow-hidden rounded-full border border-border bg-card/60 px-4 md:flex">
      <div key={text} className="flex animate-tagline-in items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="size-4 text-primary" />
        {text}
      </div>
    </div>
  )
}

export function AuthPageShell({
  title,
  subtitle,
  subtitleLink,
  subtitleLinkLabel,
  sideTitle,
  sideDescription,
  sideCards = [],
  sideFooter,
  children,
  footer,
}) {
  const { isDark, toggleTheme } = useAppThemeToggle()

  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-300 group-hover:scale-110">
              <Scissors className="size-4" />
            </div>
            <span className="font-display text-base font-bold tracking-wide text-foreground">Sahasra</span>
          </Link>
          <HeaderTagline />
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground sm:inline-flex"
            >
              <Home className="size-4" />
              Home
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-all duration-200 hover:scale-105 hover:bg-muted hover:text-foreground"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-73px)] lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 lg:block">
          <div className="absolute -left-32 -top-32 size-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -right-32 bottom-0 size-80 rounded-full bg-accent/5 blur-3xl" />

          <div className="relative flex h-full flex-col items-center justify-center px-8 py-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-12"
            >
              <h2 className="font-display text-4xl font-bold text-foreground">{sideTitle}</h2>
              <p className="mt-3 max-w-sm text-muted-foreground">{sideDescription}</p>
            </motion.div>

            {sideCards.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="w-full max-w-xs space-y-4"
              >
                {sideCards.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-4 backdrop-blur-sm"
                  >
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="size-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{item.text}</p>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : null}

            {sideFooter ? (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-12 w-full max-w-xs"
              >
                {sideFooter}
              </motion.div>
            ) : null}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center px-4 py-12 sm:px-6 lg:px-12"
        >
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
              {subtitle ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {subtitle}{" "}
                  {subtitleLink && subtitleLinkLabel ? (
                    <Link to={subtitleLink} className="font-semibold text-accent hover:text-accent/80">
                      {subtitleLinkLabel}
                    </Link>
                  ) : null}
                </p>
              ) : null}
            </div>
            {children}
            {footer}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
