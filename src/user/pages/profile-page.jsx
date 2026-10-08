"use client";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Cake, Check, ChevronRight, Crown, Gift, LogOut, Mail, Moon, Pencil, Phone, Sun, User, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { useAppThemeToggle } from "@/components/theme-provider";
import { Avatar, BrandLoader, ButtonLoadingMorph, FloatingLabelInput, useAsyncAction } from "@/components/kit";
import { haptic, spring } from "@/components/motion/presets";
import { calculateAge, updateCustomerProfile } from "@/lib/customer-profile";
import { formatPhone } from "@/lib/format";
import { formatIsoDate } from "@/lib/salon-date";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { UserLayout } from "../portal/user-layout";
import { useInvite } from "../portal/user-frame-context";
import { resetLoyalty } from "../lib/use-loyalty";

const GENDERS = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
];
const GENDER_LABELS = Object.fromEntries(GENDERS.map((g) => [g.value, g.label]));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => `${n}`.padStart(2, "0");

/** Today as YYYY-MM-DD on this device; a birthday can't be in the future. */
function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Birthday as three selects (day / month / year). The contract reserves DateStrip for booking
 * dates and bans <input type="date">; a birthday needs year-level jumps, which selects do best.
 */
function BirthdayField({ value, onChange }) {
  const [y, m, d] = (value || "--").split("-");
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - 1900 + 1 }, (_, i) => `${thisYear - i}`);
  const days = Array.from({ length: 31 }, (_, i) => pad(i + 1));
  const update = (part, v) => {
    const next = { y, m, d, [part]: v };
    if (!next.y && !next.m && !next.d) return onChange("");
    const iso = `${next.y || ""}-${next.m || ""}-${next.d || ""}`;
    onChange(iso);
  };
  const cls = "h-12 w-full min-w-0 rounded-control bg-card px-3 text-sm font-medium ring-1 ring-inset ring-border outline-none focus-visible:ring-2 focus-visible:ring-portal";
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 flex items-center gap-2 text-caption font-semibold text-ink-neutral">
        <Cake className="size-4 text-portal" aria-hidden /> Birthday
      </legend>
      <div className="grid grid-cols-[1fr_1.2fr_1.4fr] gap-2">
        <select aria-label="Day" value={d || ""} onChange={(e) => update("d", e.target.value)} className={cls}>
          <option value="">Day</option>
          {days.map((v) => (
            <option key={v} value={v}>
              {Number(v)}
            </option>
          ))}
        </select>
        <select aria-label="Month" value={m || ""} onChange={(e) => update("m", e.target.value)} className={cls}>
          <option value="">Month</option>
          {MONTHS.map((label, i) => (
            <option key={label} value={pad(i + 1)}>
              {label}
            </option>
          ))}
        </select>
        <select aria-label="Year" value={y || ""} onChange={(e) => update("y", e.target.value)} className={cls}>
          <option value="">Year</option>
          {years.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-portal/12 text-portal">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-caption text-ink-neutral">{label}</p>
        <div className="truncate text-[15px] font-semibold">{children}</div>
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, onClick, to, trailing, tone }) {
  const cls = cn("flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold transition-colors hover:bg-muted", tone === "danger" && "text-ink-destructive hover:bg-destructive/10");
  const inner = (
    <>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone === "danger" ? "bg-destructive/12" : "bg-muted")}>
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="flex-1">{label}</span>
      {trailing ?? <ChevronRight className="size-4 text-ink-neutral" aria-hidden />}
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

const Unset = ({ children }) => <span className="text-sm font-normal text-ink-neutral">{children}</span>;

export default function UserProfilePage() {
  const { appUser, loading, logout, refresh } = useAuth();
  const { isDark, toggleTheme } = useAppThemeToggle();
  const openInvite = useInvite();
  const reduce = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", gender: "", dateOfBirth: "" });
  const save = useAsyncAction({ successMs: 700 });

  // Re-seed the draft whenever the editor opens or the saved profile changes.
  useEffect(() => {
    if (!appUser) return;
    setForm({ name: appUser.name ?? "", gender: GENDER_LABELS[appUser.gender] ? appUser.gender : "", dateOfBirth: appUser.dateOfBirth ?? "" });
  }, [appUser, editing]);

  const dirty = useMemo(
    () => form.name.trim() !== (appUser?.name ?? "") || form.gender !== (GENDER_LABELS[appUser?.gender] ? appUser.gender : "") || form.dateOfBirth !== (appUser?.dateOfBirth ?? ""),
    [appUser, form]
  );
  const dobValid = !form.dateOfBirth || (/^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth) && form.dateOfBirth <= todayIso() && !Number.isNaN(new Date(`${form.dateOfBirth}T00:00:00`).getTime()));
  const nameError = form.name.trim() ? undefined : "Name is required";
  const canSave = !nameError && dobValid && dirty && save.state !== "loading";

  async function handleSave() {
    try {
      await updateCustomerProfile({
        name: form.name.trim(),
        // Omit rather than send "": there is no way to un-answer gender once it's set.
        ...(form.gender ? { gender: form.gender } : {}),
        dateOfBirth: form.dateOfBirth,
      });
      await refresh();
      notify.success("Profile saved");
      setTimeout(() => setEditing(false), 600);
    } catch (error) {
      notify.error("Couldn't save your profile", { description: error.message });
      throw error;
    }
  }

  if (loading || !appUser) {
    return (
      <UserLayout pageTitle="Profile">
        <BrandLoader className="py-24" label="Loading" />
      </UserLayout>
    );
  }

  const segment = `${appUser.membershipSegment ?? "FREE"}`.toUpperCase();
  const member = segment !== "FREE";
  const age = calculateAge(form.dateOfBirth);

  return (
    <UserLayout pageTitle="Profile" width="md">
      <div className="space-y-4">
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.soft}
          className="relative overflow-hidden isolate flex flex-wrap items-center gap-4 rounded-card bg-card p-5 ring-1 ring-inset ring-border/60 sm:p-6"
        >
          <Avatar name={appUser.name} size="xl" className="relative z-[2] shadow-lift" />
          <div className="relative z-[2] min-w-0 flex-1 basis-40">
            <h2 className="truncate font-display text-title font-bold">{appUser.name}</h2>
            <p className="truncate text-caption text-ink-neutral">{appUser.email}</p>
          </div>
          <Link
            to="/user-dashboard/membership"
            className={cn("relative z-[2] inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold", member ? "bg-gold/18 text-ink-warning ring-1 ring-inset ring-gold/40" : "bg-card text-foreground ring-1 ring-inset ring-border")}
          >
            <Crown className="size-4" aria-hidden />
            {member ? segment.charAt(0) + segment.slice(1).toLowerCase() : "Free"}
          </Link>
        </motion.section>

        <section className="rounded-card bg-card p-5 ring-1 ring-inset ring-border/60 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-headline font-semibold">Details</h2>
            {editing ? null : (
              <button type="button" onClick={() => setEditing(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-muted px-4 text-sm font-semibold hover:bg-muted/70">
                <Pencil className="size-4" aria-hidden /> Edit
              </button>
            )}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {editing ? (
              <motion.div key="edit" initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.soft} className="space-y-5 pt-2">
                <FloatingLabelInput label="Name" icon={User} autoComplete="name" value={form.name} error={nameError} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                <div>
                  <p className="mb-2 flex items-center gap-2 text-caption font-semibold text-ink-neutral">
                    <UserRound className="size-4 text-portal" aria-hidden /> Gender
                  </p>
                  <LayoutGroup id="profile-gender">
                    <div role="radiogroup" aria-label="Gender" className="grid grid-cols-3 gap-2 rounded-full bg-muted p-1">
                      {GENDERS.map((g) => {
                        const active = form.gender === g.value;
                        return (
                          <button
                            key={g.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => {
                              haptic("tap");
                              setForm((prev) => ({ ...prev, gender: g.value }));
                            }}
                            className={cn("relative h-10 rounded-full text-sm font-semibold", active ? "text-foreground" : "text-ink-neutral")}
                          >
                            {active ? <motion.span layoutId="gender-pill" transition={reduce ? { duration: 0 } : spring.snappy} className="absolute inset-0 rounded-full bg-card shadow-soft" /> : null}
                            <span className="relative">{g.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </LayoutGroup>
                </div>
                <div>
                  <BirthdayField value={form.dateOfBirth} onChange={(v) => setForm((prev) => ({ ...prev, dateOfBirth: v }))} />
                  <p className={cn("mt-1.5 h-4 text-caption", dobValid ? "text-ink-neutral" : "text-ink-destructive")}>{!dobValid ? "Pick a full, past date" : age !== null ? `${age} yrs` : ""}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <ButtonLoadingMorph state={save.state} icon={Check} className="flex-1" disabled={!canSave} onClick={() => save.run(handleSave)} successLabel="Saved">
                    Save
                  </ButtonLoadingMorph>
                  <ButtonLoadingMorph variant="secondary" icon={X} disabled={save.state === "loading"} onClick={() => setEditing(false)}>
                    Cancel
                  </ButtonLoadingMorph>
                </div>
              </motion.div>
            ) : (
              <motion.div key="view" initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.soft} className="divide-y divide-border">
                <InfoRow icon={Mail} label="Email">
                  {appUser.email}
                </InfoRow>
                {appUser.phone ? (
                  <InfoRow icon={Phone} label="Phone">
                    {formatPhone(appUser.phone)}
                  </InfoRow>
                ) : null}
                <InfoRow icon={UserRound} label="Gender">
                  {GENDER_LABELS[appUser.gender] ?? <Unset>Add gender</Unset>}
                </InfoRow>
                <InfoRow icon={Cake} label="Birthday">
                  {appUser.dateOfBirth ? formatIsoDate(appUser.dateOfBirth, { day: "numeric", month: "long", year: "numeric" }) : <Unset>Add birthday</Unset>}
                </InfoRow>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="rounded-card bg-card p-2 ring-1 ring-inset ring-border/60" aria-label="Settings">
          <SettingRow
            icon={isDark ? Sun : Moon}
            label={isDark ? "Light mode" : "Dark mode"}
            onClick={toggleTheme}
            trailing={
              <span className={cn("flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors", isDark ? "bg-portal" : "bg-muted-foreground/30")} aria-hidden>
                <motion.span layout={!reduce} transition={spring.snappy} className={cn("size-6 rounded-full bg-white shadow-soft", isDark && "ml-auto")} />
              </span>
            }
          />
          <SettingRow icon={Gift} label="Invite a friend" onClick={openInvite} />
          <SettingRow icon={Crown} label="Membership" to="/user-dashboard/membership" />
          <SettingRow
            icon={LogOut}
            label="Sign out"
            tone="danger"
            trailing={false}
            onClick={() => {
              resetLoyalty();
              void logout();
            }}
          />
        </section>
      </div>
    </UserLayout>
  );
}
