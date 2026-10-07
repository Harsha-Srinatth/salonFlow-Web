import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, KeyRound, Link2Off, Lock, Save, ShieldCheck } from "lucide-react"
import { toast } from "@/lib/notify";
import { verifyPasswordResetCode } from "firebase/auth"
import { AuthPageShell } from "@/auth/components/auth-page-shell"
import { completeDbPasswordReset } from "@/lib/auth/auth-client"
import { firebaseAuth } from "@/lib/firebase/client"
import { BrandLoader } from "@/components/kit/brand-loader"
import { ButtonLoadingMorph } from "@/components/kit/button-loading-morph"
import { FloatingLabelInput } from "@/components/kit/floating-label-input"

export default function AuthResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get("oobCode") ?? ""
  const mode = searchParams.get("mode") ?? ""

  const [emailPreview, setEmailPreview] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
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

  const backToLogin = (
    <Link to="/auth/login" className="inline-flex h-11 items-center gap-1.5 font-semibold text-ink-primary">
      <ArrowLeft className="size-4" aria-hidden /> Back to sign in
    </Link>
  )

  if (linkStatus === "checking") {
    return (
      <AuthPageShell title="Reset password" sideTitle="Checking link" sideDescription="One moment while we check your reset link." sideCards={[]}>
        <BrandLoader variant="scissors" size="md" label="Checking your link…" className="py-6" />
      </AuthPageShell>
    )
  }

  if (linkStatus === "invalid" || !oobCode) {
    const resetUrl =
      typeof window !== "undefined" ? `${window.location.origin}/auth/reset-password` : "/auth/reset-password"

    return (
      <AuthPageShell
        title="Link expired"
        subtitle="Request a new one from"
        subtitleLink="/auth/login"
        subtitleLinkLabel="sign in"
        sideTitle="Link expired"
        sideDescription="Reset links work once and expire. Ask for a fresh one."
        sideCards={[{ icon: Link2Off, text: "Invalid or used link" }]}
        footer={backToLogin}
      >
        <div className="flex items-start gap-3 rounded-2xl bg-warning/10 p-4 ring-1 ring-inset ring-warning/40">
          <Link2Off className="mt-0.5 size-5 shrink-0 text-ink-warning" aria-hidden />
          <p className="text-sm text-ink-neutral">
            Finish reset on this site (not only Google&apos;s default page), or your database password will not update.
            In Firebase Console → Authentication → Templates → Password reset, set the action URL to{" "}
            <span className="break-all font-mono text-xs text-foreground">{resetUrl}</span>
          </p>
        </div>
      </AuthPageShell>
    )
  }

  const mismatch = confirm && password !== confirm ? "Passwords don't match" : undefined

  return (
    <AuthPageShell
      title="Choose a new password"
      subtitle="Remembered it?"
      subtitleLink="/auth/login"
      subtitleLinkLabel="Sign in"
      sideTitle="Secure reset"
      sideDescription={emailPreview ? `Updating the password for ${emailPreview}.` : "Your new password is saved for app sign-in."}
      sideCards={[
        { icon: KeyRound, text: "8+ characters" },
        { icon: ShieldCheck, text: "Confirm before saving" },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FloatingLabelInput label="New password" icon={Lock} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} hint="8+ characters" />
        <FloatingLabelInput label="Confirm password" icon={Lock} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} error={mismatch} success={Boolean(confirm) && !mismatch && password.length >= 8} />
        <ButtonLoadingMorph type="submit" state={submitting ? "loading" : "idle"} icon={Save} size="lg" fullWidth loadingLabel="Saving…">
          Update password
        </ButtonLoadingMorph>
      </form>
    </AuthPageShell>
  )
}
