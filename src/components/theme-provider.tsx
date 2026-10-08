import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react"

type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light"
  const stored = localStorage.getItem("theme")
  if (stored === "light" || stored === "dark") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.style.colorScheme = theme
  localStorage.setItem("theme", theme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useLayoutEffect(() => {
    applyThemeClass(theme)
  }, [theme])

  const toggleTheme = useCallback(() => setTheme(current => (current === "dark" ? "light" : "dark")), [])
  // Stable value: App re-renders on every navigation, and a fresh object here re-rendered
  // every theme consumer (each portal shell) with it.
  const value = useMemo(() => ({ theme, toggleTheme, isDark: theme === "dark" }), [theme, toggleTheme])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppThemeToggle() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useAppThemeToggle must be used within ThemeProvider")
  return ctx
}
