import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, KeyRound } from "lucide-react"
import { toast } from "sonner"
import { AuthPageShell } from "@/auth/components/auth-page-shell"
import { setStaffPassword } from "@/lib/staff-auth-client"
import { InlineOrb } from "@/components/shared/loading-orb"

const SETUP_TOKEN_KEY = "staff_setup_token"

export default function StaffSetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const token = window.sessionStorage.getItem(SETUP_TOKEN_KEY)
    if (!token) {
      toast.error("Start from phone verification")
      navigate("/staff/verify-otp", { replace: true })
    }
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (password !== confirm) {
      toast.error("Passwords do not match")
      return
    }

    const token = window.sessionStorage.getItem(SETUP_TOKEN_KEY)
    if (!token) {
      toast.error("Session expired — verify OTP again")
      navigate("/staff/verify-otp")
      return
    }

    setSubmitting(true)
    try {
      await setStaffPassword(token, password)
      window.sessionStorage.removeItem(SETUP_TOKEN_KEY)
      toast.success("Password saved — you can sign in")
      navigate("/auth/login")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to set password")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell
      title="Set password"
      subtitle="Need to verify again?"
      subtitleLink="/staff/verify-otp"
      subtitleLinkLabel="Back to OTP"
      sideTitle="Almost done"
      sideDescription="Choose a strong password for your staff account. The setup link expires in about 5 minutes."
      sideCards={[{ icon: KeyRound, text: "Min. 8 characters", sub: "Use letters and numbers" }]}
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
          {submitting ? "Saving…" : "Save password"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/staff/verify-otp" className="font-semibold text-primary hover:text-primary/80">
          Back to OTP verification
        </Link>
      </p>
    </AuthPageShell>
  )
}
