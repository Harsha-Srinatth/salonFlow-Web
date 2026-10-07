import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, KeyRound, Lock, Save, ShieldCheck } from "lucide-react"
import { toast } from "@/lib/notify";
import { AuthPageShell } from "@/auth/components/auth-page-shell"
import { setStaffPassword } from "@/lib/staff-auth-client"
import { ButtonLoadingMorph } from "@/components/kit/button-loading-morph"
import { FloatingLabelInput } from "@/components/kit/floating-label-input"

const SETUP_TOKEN_KEY = "staff_setup_token"

export default function StaffSetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
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

  const mismatch = confirm && password !== confirm ? "Passwords don't match" : undefined

  return (
    <AuthPageShell
      title="Set your password"
      subtitle="Need to verify again?"
      subtitleLink="/staff/verify-otp"
      subtitleLinkLabel="Back to code"
      sideTitle="Almost done"
      sideDescription="Pick a strong password. This setup link expires in about 5 minutes."
      sideCards={[
        { icon: KeyRound, text: "8+ characters" },
        { icon: ShieldCheck, text: "Letters & numbers" },
      ]}
      footer={
        <Link to="/staff/verify-otp" className="inline-flex h-11 items-center gap-1.5 font-semibold text-ink-primary">
          <ArrowLeft className="size-4" aria-hidden /> Back to phone check
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordPair password={password} setPassword={setPassword} confirm={confirm} setConfirm={setConfirm} mismatch={mismatch} />
        <ButtonLoadingMorph type="submit" state={submitting ? "loading" : "idle"} icon={Save} size="lg" fullWidth loadingLabel="Saving…">
          Save password
        </ButtonLoadingMorph>
      </form>
    </AuthPageShell>
  )
}

function PasswordPair({ password, setPassword, confirm, setConfirm, mismatch }) {
  return (
    <div className="space-y-4">
      <FloatingLabelInput label="New password" icon={Lock} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} hint="8+ characters" />
      <FloatingLabelInput label="Confirm password" icon={Lock} type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} error={mismatch} success={Boolean(confirm) && !mismatch && password.length >= 8} />
    </div>
  )
}
