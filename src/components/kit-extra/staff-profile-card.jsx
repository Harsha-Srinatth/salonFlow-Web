import { Avatar } from "@/components/kit/avatar";
import { IconButton } from "@/components/kit/icon-button";
import { FadeIn } from "@/components/motion/fade-in";
import { useAppThemeToggle } from "@/components/theme-provider";
import { Mail, Moon, Phone, Sun } from "lucide-react";
import { formatPhone } from "@/lib/format";

/**
 * Staff account card for the reception and stylist profile pages: avatar on an aurora header,
 * name, role, contact rows, a theme switch and the sign-out action. Shows only fields the
 * staff session (`/api/auth/staff/me`) actually returns.
 * @param {{ user: { name?: string, email?: string, phone?: string }, roleLabel: string, roleIcon: any, signOut?: React.ReactNode, children?: React.ReactNode }} props
 */
export function StaffProfileCard({ user, roleLabel, roleIcon: RoleIcon, signOut, children }) {
  const { isDark, toggleTheme } = useAppThemeToggle();
  const rows = [
    user.email ? { icon: Mail, label: "Email", value: user.email } : null,
    user.phone ? { icon: Phone, label: "Phone", value: formatPhone(user.phone) } : null,
  ].filter(Boolean);

  return (
    <FadeIn className="mx-auto max-w-xl space-y-4">
      <section className="overflow-hidden rounded-card border border-border/60 bg-card shadow-soft">
        <div className="aurora grain relative h-24" aria-hidden />
        <div className="relative -mt-12 flex flex-col items-center px-5 pb-6 text-center">
          <Avatar name={user.name} size="xl" ring className="ring-4 ring-card" />
          <h2 className="mt-3 font-display text-title font-bold">{user.name}</h2>
          <span className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-full bg-portal/12 px-3 text-caption font-semibold text-portal">
            {RoleIcon ? <RoleIcon className="size-3.5" aria-hidden /> : null}
            {roleLabel}
          </span>
        </div>
        {rows.length ? (
          <ul className="divide-y divide-border/60 border-t border-border/60">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid size-10 place-items-center rounded-xl bg-muted text-ink-neutral">
                  <row.icon className="size-4.5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-micro font-semibold text-ink-neutral uppercase">{row.label}</span>
                  <span className="block truncate font-medium">{row.value}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {children}

      <section className="space-y-1 rounded-card border border-border/60 bg-card p-2 shadow-soft">
        <div className="flex items-center gap-3 px-3 py-1.5">
          <span className="flex-1 text-sm font-semibold">{isDark ? "Dark mode" : "Light mode"}</span>
          <IconButton icon={isDark ? Sun : Moon} label={isDark ? "Switch to light mode" : "Switch to dark mode"} variant="soft" onClick={toggleTheme} />
        </div>
        {signOut}
      </section>
    </FadeIn>
  );
}
