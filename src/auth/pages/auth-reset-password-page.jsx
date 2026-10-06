import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { Eye, EyeOff, Lock } from "lucide-react"
import { toast } from "@/lib/notify";
import { verifyPasswordResetCode } from "firebase/auth"
import { AuthPageShell } from "@/auth/components/auth-page-shell"
import { completeDbPasswordReset } from "@/lib/auth/auth-client"
import { firebaseAuth } from "@/lib/firebase/client"
import { InlineOrb } from "@/components/shared/loading-orb"

export default function AuthResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get("oobCode") ?? ""
  const mode = searchParams.get("mode") ?? ""

  const [emailPreview, setEmailPreview] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [linkStatus, setLinkStatus] = useState("checking")

  useEffect(() => {
    if (!oobCode || (mode && mode !== "resetPassword")) {
      setLinkStatus("invalid")
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const email = await verifyPasswordResetCode(firebaseAuth, oobCode)
        if (!cancelled) {
          setEmailPreview(email)
          setLinkStatus("ok")
        }
      } catch {
        if (!cancelled) setLinkStatus("invalid")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [oobCode, mode])

  async function handleSubmit(event) {
    event.preventDefault()
    if (linkStatus !== "ok") return
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (password !== confirm) {
      toast.error("Passwords do not match")
      return
    }

    setSubmitting(true)
    try {
      await completeDbPasswordReset(oobCode, password)
      toast.success("Password updated — sign in with your new password")
      navigate("/auth/login", { replace: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reset password")
    } finally {
      setSubmitting(false)
    }
  }

  if (linkStatus === "checking") {
    return (
      <AuthPageShell
        title="Reset password"
        sideTitle="Checking link"
        sideDescription="Please wait while we verify your reset link."
        sideCards={[]}
      >
        <p className="text-sm text-muted-foreground">Checking your link…</p>
      </AuthPageShell>
    )
  }

  if (linkStatus === "invalid" || !oobCode) {
    const resetUrl =
      typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : "/auth/reset-password"

    return (
      <AuthPageShell
        title="Invalid or expired link"
        subtitle="Return to"
        subtitleLink="/auth/login"
        subtitleLinkLabel="sign in"
        sideTitle="Link expired"
        sideDescription="Request a new reset from the login page."
        sideCards={[]}
      >
        <p className="text-sm leading-6 text-muted-foreground">
          Finish reset on this site (not only Google&apos;s default page), or your database password will not update.
          In Firebase Console → Authentication → Templates → Password reset, set the action URL to{" "}
          <span className="break-all font-sans tabular-nums text-xs text-foreground">{resetUrl}</span>
        </p>
        <Link
          to="/auth/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted"
        >
          Back to login
        </Link>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell
      title="Choose a new password"
      subtitle="Remembered it?"
      subtitleLink="/auth/login"
      subtitleLinkLabel="Sign in"
      sideTitle="Secure reset"
      sideDescription={
        emailPreview
          ? `Updating password for ${emailPreview}. Submitting this form updates the password stored for app login.`
          : "Your new password is saved for app sign-in."
      }
      sideCards={[{ icon: Lock, text: "Min. 8 characters", sub: "Confirm before saving" }]}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            New password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full rounded-xl border border-border bg-card py-3 pl-4 pr-10 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowPassword(value => !value)}
              className="absolute right-3 top-3.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Confirm password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="w-full rounded-xl border border-border bg-card py-3 pl-4 pr-10 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(value => !value)}
              className="absolute right-3 top-3.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirm ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? <InlineOrb theme="light" /> : null}
          {submitting ? "Saving…" : "Update password"}
        </button>
      </form>
    </AuthPageShell>
  )
}
