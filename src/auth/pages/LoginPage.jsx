import { GOOGLE_RATING } from "@/lib/public-claims";
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import { CalendarCheck, Gift, KeyRound, Lock, LogIn, Mail, MessageSquareText, Pencil, Phone, Star } from "lucide-react"
import { toast } from "@/lib/notify";
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDivider, AuthPageShell, GoogleLogo } from "@/auth/components/auth-page-shell"
import { getFirebaseAuthErrorMessage } from "@/auth/lib/auth-errors"
import { isValidE164Phone, toE164Phone } from "@/auth/lib/phone"
import { getDashboardPathByRole } from "@/lib/auth/role-routing"
import {
  assertCanSendOtp,
  assertOtpVerifyNotLocked,
  clearOtpVerifyGuards,
  recordOtpSend,
  recordOtpVerifyFailure,
} from "@/lib/otp-throttle"
import {
  cancelPendingSignup as abandonGoogleSignIn,
  requestPasswordReset,
  sendPhoneOtp,
  signInWithAppPassword,
  signInWithGoogle,
  syncSessionWithBackend,
  verifyPhoneOtp,
} from "@/lib/auth/auth-client"
import { staffLogin } from "@/lib/staff-auth-client"
import { variants } from "@/components/motion/presets"
import { AnimatedTabBar } from "@/components/kit/animated-tab-bar"
import { ButtonLoadingMorph } from "@/components/kit/button-loading-morph"
import { FloatingLabelInput } from "@/components/kit/floating-label-input"
import { OtpInput } from "@/components/kit/otp-input"

const ACCOUNT_NOT_FOUND_MESSAGES = new Set(["ACCOUNT_NOT_FOUND", "Phone number is required for registration"])

export default function LoginPage() {
  const navigate = useNavigate()
  const { appUser, loading, refresh, setSignedInUser } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [activeTab, setActiveTab] = useState("email")
  const [submitting, setSubmitting] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")
  const [otpError, setOtpError] = useState(false)
  // Guards the auto-submit on the sixth digit against a second submit (Enter / button) racing it:
  // a duplicate confirm burns one of the customer's limited attempts.
  const verifyingRef = useRef(false)

  useEffect(() => {
    if (loading || !appUser?.role) return
    if (["ADMIN", "USER", "STAFF", "RECEPTIONIST"].includes(appUser.role)) {
      navigate(getDashboardPathByRole(appUser.role), { replace: true })
    }
  }, [appUser, loading, navigate])

  async function handleEmailLogin(event) {
    event.preventDefault()
    if (!email || !password) {
      toast.error("Email and password are required")
      return
    }

    setSubmitting(true)
    try {
      let user = null
      try {
        user = await staffLogin(email, password)
      } catch (staffError) {
        const staffMessage = staffError instanceof Error ? staffError.message : ""
        if (staffMessage === "VERIFY_PHONE_FIRST" || staffMessage === "NEEDS_PASSWORD") {
          toast.error("Verify phone first, then set your password to continue.")
          navigate("/staff/verify-otp", { replace: true })
          return
        }
        if (staffMessage === "TOO_MANY_ATTEMPTS") throw staffError
        user = await signInWithAppPassword(email, password)
      }

      setSignedInUser(user)
      void refresh().catch(() => undefined)
      navigate(getDashboardPathByRole(user.role), { replace: true })
      toast.success("Welcome back", { description: "You're signed in." })
    } catch (error) {
      if (error instanceof Error && error.message === "GOOGLE_ACCOUNT") {
        toast.error("You registered with Google", {
          description: "This account has no password. Please continue with Google.",
          action: { label: "Continue with Google", onClick: handleGoogleLogin },
          duration: 8000,
        })
      } else {
        toast.error("Couldn't sign you in", { description: getFirebaseAuthErrorMessage(error) })
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      toast.error("Enter your email first")
      return
    }
    setSubmitting(true)
    try {
      await requestPasswordReset(email)
      toast.success("Password reset email sent")
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendOtp(event) {
    event.preventDefault()
    const e164 = toE164Phone(phone)
    if (!isValidE164Phone(e164)) {
      toast.error("Enter a valid 10-digit phone number")
      return
    }

    setSubmitting(true)
    try {
      assertCanSendOtp("customer", e164)
      await sendPhoneOtp(e164)
      recordOtpSend("customer", e164)
      setOtpSent(true)
      toast.success("OTP sent to your phone")
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyOtp(event, code = otp) {
    event?.preventDefault()
    const e164 = toE164Phone(phone)
    if (!code.trim()) {
      toast.error("Enter OTP code")
      return
    }
    if (verifyingRef.current) return
    verifyingRef.current = true

    setSubmitting(true)
    setOtpError(false)
    try {
      assertOtpVerifyNotLocked("customer", e164)
      const result = await verifyPhoneOtp(code.trim())
      clearOtpVerifyGuards("customer", e164)
      if (result.appUser?.role) {
        setSignedInUser(result.appUser)
        toast.success("Phone verified and signed in")
        navigate(getDashboardPathByRole(result.appUser.role), { replace: true })
      } else {
        toast.error("No account found for this phone number. Please sign up first.")
        navigate("/auth/signup", { replace: true, state: { phone } })
      }
    } catch (error) {
      recordOtpVerifyFailure("customer", e164)
      setOtpError(true)
      if (error instanceof Error && ACCOUNT_NOT_FOUND_MESSAGES.has(error.message)) {
        toast.error("No account found for this phone number. Please sign up first.")
        navigate("/auth/signup", { replace: true, state: { phone } })
        return
      }
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      verifyingRef.current = false
      setSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setSubmitting(true)
    try {
      await signInWithGoogle()
      const syncedUser = await syncSessionWithBackend()
      if (syncedUser?.role) {
        setSignedInUser(syncedUser)
        toast.success("Welcome back", { description: "Signed in with Google." })
        navigate(getDashboardPathByRole(syncedUser.role), { replace: true })
      } else {
        await abandonGoogleSignIn()
        toast.error("No account found", {
          description: "This Google account isn't registered yet. Please sign up first.",
        })
        navigate("/auth/signup", { replace: true })
      }
    } catch (error) {
      if (error instanceof Error && ACCOUNT_NOT_FOUND_MESSAGES.has(error.message)) {
        // Signing out matters as much as the redirect: the popup left a real
        // Firebase session behind, and carrying it onto the signup page starts
        // that flow already half-authenticated as an account that does not exist
        // here yet.
        await abandonGoogleSignIn()
        toast.error("No account found", {
          description: "This Google account isn't registered yet. Please sign up first.",
        })
        navigate("/auth/signup", { replace: true })
        return
      }
      // A failed backend sync leaves a live Firebase session behind; without this the
      // next attempt starts half-signed-in.
      await abandonGoogleSignIn()
      toast.error("Google sign-in failed", { description: getFirebaseAuthErrorMessage(error) })
    } finally {
      setSubmitting(false)
    }
  }

  const switchTab = tab => {
    setActiveTab(tab)
    setOtpSent(false)
    setOtp("")
    setOtpError(false)
  }
  const busy = submitting ? "loading" : "idle"

  return (
    <AuthPageShell
      title="Sign in"
      subtitle="New here?"
      subtitleLink="/auth/signup"
      subtitleLinkLabel="Create an account"
      sideTitle="Welcome back"
      sideDescription="Sign in to book, track your visit and use your rewards."
      sideCards={[
        { icon: Star, text: GOOGLE_RATING.label },
        { icon: CalendarCheck, text: "Book online" },
        { icon: Gift, text: "Refer & earn" },
      ]}
      footer={
        <>
          Staff, first time?{" "}
          <Link to="/staff/verify-otp" className="tap font-semibold text-ink-primary underline-offset-4 hover:underline">
            Verify phone &amp; set password
          </Link>
        </>
      }
    >
      <AnimatedTabBar
        items={[
          { value: "email", label: "Email", icon: Mail },
          { value: "phone", label: "Phone OTP", icon: MessageSquareText },
        ]}
        value={activeTab}
        onChange={switchTab}
        fullWidth
        label="Sign-in method"
        className="mb-6"
      />

      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "email" ? (
          <motion.form key="email-form" variants={variants.fadeUp} initial="hidden" animate="show" exit="exit" onSubmit={handleEmailLogin} className="space-y-4">
            <FloatingLabelInput label="Email" icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
            <FloatingLabelInput label="Password" icon={Lock} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            <div className="flex justify-end">
              <button type="button" onClick={handleForgotPassword} disabled={submitting} className="tap inline-flex items-center gap-1.5 text-sm font-semibold text-ink-primary disabled:opacity-50">
                <KeyRound className="size-4" aria-hidden /> Forgot password?
              </button>
            </div>
            <ButtonLoadingMorph type="submit" state={busy} icon={LogIn} size="lg" fullWidth loadingLabel="Signing in…" successLabel="Signed in">
              Sign in
            </ButtonLoadingMorph>
          </motion.form>
        ) : (
          <motion.form key={otpSent ? "otp-form" : "phone-form"} variants={variants.fadeUp} initial="hidden" animate="show" exit="exit" onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
            {!otpSent ? (
              <>
                <FloatingLabelInput
                  label="Mobile number"
                  icon={Phone}
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                  autoComplete="tel-national"
                  hint="+91 · 10 digits"
                  success={phone.length === 10}
                />
                <ButtonLoadingMorph type="submit" state={busy} icon={MessageSquareText} size="lg" fullWidth loadingLabel="Sending code…">
                  Send code
                </ButtonLoadingMorph>
              </>
            ) : (
              <>
                <p className="text-center text-sm text-ink-neutral">
                  Code sent to <span className="font-semibold text-foreground tabular-nums">+91 {phone}</span>
                </p>
                <OtpInput
                  value={otp}
                  onChange={value => {
                    setOtp(value)
                    if (otpError) setOtpError(false)
                  }}
                  onComplete={code => void handleVerifyOtp(undefined, code)}
                  error={otpError}
                  disabled={submitting}
                />
                <ButtonLoadingMorph type="submit" state={busy} icon={LogIn} size="lg" fullWidth loadingLabel="Verifying…">
                  Verify &amp; sign in
                </ButtonLoadingMorph>
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false)
                    setOtp("")
                    setOtpError(false)
                  }}
                  className="mx-auto flex h-11 items-center gap-1.5 text-sm font-semibold text-ink-neutral hover:text-foreground"
                >
                  <Pencil className="size-4" aria-hidden /> Edit number
                </button>
              </>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      <AuthDivider label="or" />

      <ButtonLoadingMorph variant="outline" size="lg" fullWidth onClick={handleGoogleLogin} disabled={submitting}>
        <GoogleLogo /> Continue with Google
      </ButtonLoadingMorph>
    </AuthPageShell>
  )
}
