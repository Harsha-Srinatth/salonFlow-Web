import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Moon, Scissors, Sun } from "lucide-react"
import { useAppThemeToggle } from "@/components/theme-provider"

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
            <span className="font-serif text-base font-bold tracking-wide text-foreground">Sahasra</span>
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
              <h2 className="font-serif text-4xl font-bold text-foreground">{sideTitle}</h2>
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
              <h1 className="font-serif text-3xl font-bold text-foreground">{title}</h1>
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
