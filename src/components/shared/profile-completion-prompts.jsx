"use client";

import { useEffect, useState } from "react";
import { Cake, Check, Gift, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { updateCustomerProfile } from "@/lib/customer-profile";

/**
 * Visit-time prompts for the two profile fields the salon needs but may not have.
 *
 * Each one shows **only when that column is actually empty in the database** —
 * `gender === "UNSPECIFIED"` and `dateOfBirth === null`. Once a customer answers,
 * the value is on their account and the popup never appears for them again; there
 * is no local "already asked" flag that could drift out of sync with the real data.
 *
 * Gender comes first and alone: it decides which services, stylists and reward
 * cards the customer is shown, so it is the one that actually breaks the product
 * when missing. The birthday prompt only appears once gender is settled — asking
 * both at once reads as an interrogation and gets both dismissed.
 *
 * "Maybe later" hides them for the current browser session only, so the next visit
 * asks again. That is deliberate: these are worth re-asking, but trapping someone
 * in a modal they cannot close is not.
 */
const DISMISSED_KEY = "profile_prompts_dismissed";

const GENDER_CHOICES = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

/** Today as YYYY-MM-DD — a birthday can't be in the future. */
function todayIso() {
  const now = new Date();
  const pad = value => `${value}`.padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** True when the account has no usable gender. "OTHER" is an answer, so it doesn't count. */
export function needsGenderPrompt(appUser) {
  return !["MALE", "FEMALE", "OTHER"].includes(appUser?.gender);
}

/** True when the account has no date of birth stored. */
export function needsDateOfBirthPrompt(appUser) {
  return !appUser?.dateOfBirth;
}

/**
 * Presentational half — no data fetching, so it can be rendered in isolation.
 * Returns null when the account has nothing left to fill in.
 *
 * @param {{ appUser: object, saving?: boolean, onSave: (updates: object) => Promise<void>, onDismiss: () => void }} props
 */
export function ProfileCompletionPromptsView({ appUser, saving = false, onSave, onDismiss }) {
  const [genderChoice, setGenderChoice] = useState("");
  const [dobDraft, setDobDraft] = useState("");

  const showGender = needsGenderPrompt(appUser);
  const showDob = !showGender && needsDateOfBirthPrompt(appUser);
  if (!showGender && !showDob) return null;

  if (showGender) {
    return (
      <Dialog open onOpenChange={open => (open ? null : onDismiss())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Let's get your look right</DialogTitle>
            <DialogDescription className="text-sm">
              Tell us who we're styling, and we'll show you the services, stylists and reward cards meant for you —
              instead of a mixed list you have to sort through.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2 sm:grid-cols-3">
            {GENDER_CHOICES.map(choice => (
              <Button
                key={choice.value}
                type="button"
                variant={genderChoice === choice.value ? "default" : "outline"}
                disabled={saving}
                className="h-12 justify-center"
                onClick={() => {
                  setGenderChoice(choice.value);
                  void onSave({ gender: choice.value });
                }}
              >
                {genderChoice === choice.value ? <Check className="mr-1.5 size-4" /> : null}
                {choice.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Only used to personalise what you see.</p>
            <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={onDismiss}>
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={open => (open ? null : onDismiss())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-accent/10">
            <Cake className="size-6 text-accent" />
          </div>
          <DialogTitle className="text-xl">Celebrate with beauty</DialogTitle>
          <DialogDescription className="text-sm">
            Add your date of birth and we'll send you a special discount for your birthday month — our little way of
            making your day feel like an occasion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input
            type="date"
            aria-label="Date of birth"
            min="1900-01-01"
            max={todayIso()}
            value={dobDraft}
            disabled={saving}
            onChange={e => setDobDraft(e.target.value)}
          />
          <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3">
            <Gift className="mt-0.5 size-4 shrink-0 text-accent" />
            <p className="text-xs text-muted-foreground">
              We only use it for your birthday treat — nothing else, and we never share it.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={onDismiss}>
            Maybe later
          </Button>
          <Button type="button" disabled={saving || !dobDraft} onClick={() => void onSave({ dateOfBirth: dobDraft })}>
            {saving ? "Saving…" : "Claim my birthday treat"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Container: reads the signed-in customer and persists answers. */
export function ProfileCompletionPrompts() {
  const { appUser, loading, refresh } = useAuth();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem(DISMISSED_KEY) === "1"
  );
  const [saving, setSaving] = useState(false);
  // A brief pause so the first popup lands on a painted page rather than over a
  // still-loading dashboard.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading || !ready || dismissed) return null;
  if (!appUser || appUser.role !== "USER") return null;

  function dismissForSession() {
    if (typeof window !== "undefined") window.sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleSave(updates) {
    setSaving(true);
    try {
      await updateCustomerProfile(updates);
      // Refreshing is what closes this popup and lets the next one take its
      // place — the dialogs are driven by the saved account, not local state.
      await refresh();
      toast.success(
        updates.gender ? "Thanks — your services are tailored now" : "Saved — we'll be in touch on your birthday"
      );
    } catch (error) {
      toast.error(error.message ?? "Could not save that — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileCompletionPromptsView
      appUser={appUser}
      saving={saving}
      onSave={handleSave}
      onDismiss={dismissForSession}
    />
  );
}
