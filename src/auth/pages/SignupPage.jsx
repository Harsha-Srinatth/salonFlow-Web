import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  Award,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Gift,
  Loader,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthPageShell } from "@/auth/components/auth-page-shell"
import { OtpCodeInput } from "@/auth/components/otp-code-input"
import { getFirebaseAuthErrorMessage } from "@/auth/lib/auth-errors"
import { isValidE164Phone, toE164Phone } from "@/auth/lib/phone"
import { isValidFullName, mapGenderToApi } from "@/auth/lib/validation"
import { getDashboardPathByRole } from "@/lib/auth/role-routing"
import { destroyRecaptcha } from "@/lib/firebase/recaptcha"
import {
  assertOtpVerifyNotLocked,
  clearOtpVerifyGuards,
  getOtpResendWaitMs,
  recordOtpSend,
  recordOtpVerifyFailure,
} from "@/lib/otp-throttle"
import {
  beginSignupSession,
  cancelPendingSignup,
  completeVerifiedSignup,
  emailExists,
  phoneExists,
  refreshEmailVerified,
  resendSignupVerificationEmail,
  sendSignupPhoneOtp,
  setPendingSignupGender,
  setPendingSignupName,
  setPendingSignupPhone,
  setPendingSignupReferralCode,
  setPendingSignupRole,
  signInWithGoogle,
  startEmailSignup,
  verifySignupPhoneOtp,
} from "@/lib/auth/auth-client"

const genderOptions = ["Male", "Female", "Other"]

/**
 * How often the page re-asks Firebase whether the emailed link has been opened.
 * The click happens in another tab or another app entirely, so nothing pushes it
 * here — but a customer sitting on this screen expects it to notice within a
 * couple of seconds, and this is cheap (a token refresh against Firebase, not
 * this app's API).
 */
const EMAIL_POLL_INTERVAL_MS = 3000

function calculatePasswordStrength(password) {
  let strength = 0
  if (password.length >= 8) strength += 1
  if (/[a-z]+/.test(password)) strength += 1
  if (/[A-Z]+/.test(password)) strength += 1
  if (/[0-9]+/.test(password)) strength += 1
  if (/[@$!%*?&]+/.test(password)) strength += 1
  return strength
}

/** Shown in full on the verify step — spotting a typo in the address is the whole point of the step. */
function describeEmail(email) {
  return `${email ?? ""}`.trim()
}

/**
 * A single verification factor's card on the verify step.
 * Both factors get identical treatment on purpose — neither is "the real one",
 * and the account exists only once both are green.
 */
function VerificationRow({ icon: Icon, label, target, verified, children }) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        verified ? "border-success/40 bg-success/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            verified ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {verified ? <CheckCircle2 className="size-5" /> : <Icon className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            {verified ? (
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-success">Verified</span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{target}</p>
          {verified ? null : <div className="mt-3">{children}</div>}
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { appUser, loading, refresh } = useAuth()
  const referralCode = `${searchParams.get("ref") ?? ""}`.trim().toUpperCase()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState(() => `${location.state?.phone ?? ""}`.replace(/\D/g, "").slice(0, 10))
  // Intentionally empty: a pre-selected value gets accepted without being read,
  // and the account's gender decides which services and stylists it is offered.
  const [gender, setGender] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showGenderDropdown, setShowGenderDropdown] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [step, setStep] = useState("details")
  const [otp, setOtp] = useState("")
  const [otpInvalid, setOtpInvalid] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  const [resendingSms, setResendingSms] = useState(false)
  const [resendWaitSeconds, setResendWaitSeconds] = useState(0)
  const [creatingAccount, setCreatingAccount] = useState(false)
  // Google signs the customer in with an already-verified address, so that half
  // is done before the verify step is even shown; there is also no password to
  // persist for them.
  const [isGoogleSignup, setIsGoogleSignup] = useState(false)

  const signupPhone = useMemo(() => toE164Phone(phone), [phone])
  const finishedRef = useRef(false)

  useEffect(() => {
    if (loading || !appUser?.role) return
    if (["ADMIN", "USER", "STAFF", "RECEPTIONIST"].includes(appUser.role)) {
      navigate(getDashboardPathByRole(appUser.role), { replace: true })
    }
  }, [appUser, loading, navigate])

  // An abandoned challenge left rendered would be reused by whatever page loads
  // next, which is the failure this module was written to prevent.
  useEffect(() => destroyRecaptcha, [])

  const passwordStrength = calculatePasswordStrength(password)

  function getPasswordStrengthColor() {
    if (passwordStrength <= 1) return "bg-destructive"
    if (passwordStrength <= 2) return "bg-warning"
    if (passwordStrength <= 3) return "bg-accent"
    return "bg-success"
  }

  function getPasswordStrengthText() {
    if (!password) return ""
    if (passwordStrength <= 1) return "Weak"
    if (passwordStrength <= 2) return "Fair"
    if (passwordStrength <= 3) return "Good"
    return "Strong"
  }

  const detailsComplete =
    isValidFullName(fullName) &&
    email.includes("@") &&
    password.length >= 8 &&
    isValidE164Phone(signupPhone) &&
    Boolean(mapGenderToApi(gender))

  /** Live countdown on the resend button, so the wait is visible instead of only being announced after a refused tap. */
  useEffect(() => {
    if (step !== "verify" || phoneVerified) return undefined
    const tick = () => setResendWaitSeconds(Math.ceil(getOtpResendWaitMs("customer", signupPhone) / 1000))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [step, phoneVerified, signupPhone])

  /**
   * Watches for the emailed link being opened. Polls on a timer *and* on tab
   * focus: coming back to this tab is the strongest possible hint that the
   * customer just clicked it, and checking right then makes the tick appear at
   * the moment they look, rather than up to three seconds later.
   */
  useEffect(() => {
    if (step !== "verify" || emailVerified || isGoogleSignup) return undefined
    let cancelled = false
    const check = async () => {
      try {
        const verified = await refreshEmailVerified()
        if (verified && !cancelled) setEmailVerified(true)
      } catch {
        // Offline or a transient Firebase blip. The next tick retries; surfacing
        // this would put an error on screen for a step that is merely waiting.
      }
    }
    const id = window.setInterval(check, EMAIL_POLL_INTERVAL_MS)
    const onFocus = () => {
      if (document.visibilityState === "visible") void check()
    }
    window.addEventListener("visibilitychange", onFocus)
    window.addEventListener("focus", onFocus)
    void check()
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener("visibilitychange", onFocus)
      window.removeEventListener("focus", onFocus)
    }
  }, [step, emailVerified, isGoogleSignup])

  const finishSignup = useCallback(async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    setCreatingAccount(true)
    try {
      const appUserResult = await completeVerifiedSignup(isGoogleSignup ? undefined : password)
      clearOtpVerifyGuards("customer", signupPhone)
      // Before navigating, not after: the dashboard is behind a role guard that
      // reads the *provider's* user, and this page registered the account through
      // the client directly. Landing there while the context still says "signed
      // out" bounces the customer to login seconds after creating their account.
      await refresh()
      toast.success("You're all set — welcome to Sahasra!")
      navigate(appUserResult?.role ? getDashboardPathByRole(appUserResult.role) : "/auth/login", { replace: true })
    } catch (error) {
      // Leaving the flag set would strand them on a screen with both ticks green
      // and no way to retry.
      finishedRef.current = false
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setCreatingAccount(false)
    }
  }, [isGoogleSignup, password, signupPhone, navigate, refresh])

  /**
   * The account is created the instant both factors land, in whichever order
   * they land. There is no final "create account" button on purpose: by this
   * point the customer has answered every question and passed both challenges,
   * so one more tap would only be asking them to confirm that they meant it.
   */
  useEffect(() => {
    if (step !== "verify" || !phoneVerified || !emailVerified) return
    void finishSignup()
  }, [step, phoneVerified, emailVerified, finishSignup])

  /** Sends the SMS and records the send for the resend cooldown. */
  async function startPhoneVerification(e164) {
    const outcome = await sendSignupPhoneOtp(e164)
    if (outcome === "already-verified") {
      setPhoneVerified(true)
      return
    }
    recordOtpSend("customer", e164)
    toast.success("Code sent by SMS")
  }

  function stashPendingSignup() {
    setPendingSignupRole("USER")
    setPendingSignupName(fullName.trim())
    setPendingSignupPhone(signupPhone)
    setPendingSignupGender(mapGenderToApi(gender))
    if (referralCode) setPendingSignupReferralCode(referralCode)
  }

  async function handleSignup(event) {
    event.preventDefault()

    if (!fullName || !email || !password || !phone) {
      toast.error("Please fill in all required fields")
      return
    }
    if (!isValidFullName(fullName)) {
      toast.error("Please enter your full name (minimum 4 valid letters, first and last name).")
      return
    }
    if (!mapGenderToApi(gender)) {
      toast.error("Please select your gender")
      return
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (!isValidE164Phone(signupPhone)) {
      toast.error("Enter a valid 10-digit phone number")
      return
    }

    setSubmitting(true)
    try {
      // Both duplicate checks run before anything is created, so a collision is
      // an editable field rather than a half-made account to clean up.
      const [phoneTaken, emailTaken] = await Promise.all([phoneExists(signupPhone), emailExists(email)])
      if (phoneTaken) {
        toast.error("Phone already registered. Sign in with OTP, then use Forgot Password to set your password.")
        return
      }
      if (emailTaken) {
        toast.error("This email is already registered. Please sign in instead.")
        return
      }

      stashPendingSignup()
      const { resumed } = await startEmailSignup(email, password)
      setIsGoogleSignup(false)
      setStep("verify")
      setEmailVerified(false)
      setPhoneVerified(false)
      if (resumed) toast.info("Picking up where you left off — both codes are on their way.")
      await startPhoneVerification(signupPhone)
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignup() {
    if (!isValidFullName(fullName)) {
      toast.error("Please enter your full name before continuing with Google.")
      return
    }
    if (!mapGenderToApi(gender)) {
      toast.error("Please select your gender before continuing with Google.")
      return
    }
    if (!isValidE164Phone(signupPhone)) {
      toast.error("Enter a valid phone number before Google signup")
      return
    }

    setSubmitting(true)
    try {
      const phoneTaken = await phoneExists(signupPhone)
      if (phoneTaken) {
        toast.error("Phone already registered. Please sign in instead.")
        return
      }

      stashPendingSignup()
      // Google returns a verified address, so without this the provider would see
      // a fully-formed session and try to register it before the SMS step has run.
      beginSignupSession()
      const googleUser = await signInWithGoogle()
      if (await emailExists(googleUser.email ?? "")) {
        await cancelPendingSignup()
        toast.error("This Google account is already registered. Please sign in instead.")
        return
      }
      setEmail(googleUser.email ?? email)
      setIsGoogleSignup(true)
      // Google hands back a verified address; re-challenging it would be asking
      // the customer to prove something the provider already proved.
      setEmailVerified(Boolean(googleUser.emailVerified))
      setPhoneVerified(false)
      setStep("verify")
      await startPhoneVerification(signupPhone)
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResendSms() {
    if (resendWaitSeconds > 0) return
    setResendingSms(true)
    try {
      setOtp("")
      setOtpInvalid(false)
      await startPhoneVerification(signupPhone)
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setResendingSms(false)
    }
  }

  async function handleResendEmail() {
    setResendingEmail(true)
    try {
      await resendSignupVerificationEmail()
      toast.success(`Verification email sent again to ${email}`)
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setResendingEmail(false)
    }
  }

  const handleVerifyOtp = useCallback(
    async code => {
      if (verifyingOtp || phoneVerified) return
      setVerifyingOtp(true)
      setOtpInvalid(false)
      try {
        assertOtpVerifyNotLocked("customer", signupPhone)
        await verifySignupPhoneOtp(code)
        setPhoneVerified(true)
      } catch (error) {
        recordOtpVerifyFailure("customer", signupPhone)
        setOtpInvalid(true)
        setOtp("")
        toast.error(getFirebaseAuthErrorMessage(error))
      } finally {
        setVerifyingOtp(false)
      }
    },
    [verifyingOtp, phoneVerified, signupPhone]
  )

  /** Drops the half-finished Firebase account so the details step starts clean. */
  async function handleStartOver() {
    await cancelPendingSignup()
    destroyRecaptcha()
    finishedRef.current = false
    setStep("details")
    setOtp("")
    setOtpInvalid(false)
    setPhoneVerified(false)
    setEmailVerified(false)
    setIsGoogleSignup(false)
  }

  const verifiedCount = (phoneVerified ? 1 : 0) + (emailVerified ? 1 : 0)

  return (
    <AuthPageShell
      title={step === "verify" ? "Verify it's you" : "Create account"}
      subtitle={step === "verify" ? "Two quick checks and you're in." : "Already have an account?"}
      subtitleLink={step === "verify" ? undefined : "/auth/login"}
      subtitleLinkLabel={step === "verify" ? undefined : "Sign in"}
      sideTitle="Join Sahasra"
      sideDescription="Book premium salon appointments and enjoy exclusive member benefits."
      sideCards={[
        { icon: Sparkles, text: "Luxury Experience", sub: "Premium salon services" },
        { icon: CheckCircle, text: "Easy Booking", sub: "Book in 60 seconds" },
        { icon: Award, text: "Loyalty Rewards", sub: "Earn points on every visit" },
      ]}
      sideFooter={
        <div className="grid w-full max-w-xs grid-cols-2 gap-3 text-center">
          {[
            { num: "1200+", text: "Happy Members" },
            { num: "4.8/5", text: "Rating" },
          ].map(stat => (
            <div key={stat.text} className="rounded-lg border border-border bg-card/50 p-3 backdrop-blur-sm">
              <p className="font-serif text-lg font-bold text-primary">{stat.num}</p>
              <p className="text-xs text-muted-foreground">{stat.text}</p>
            </div>
          ))}
        </div>
      }
    >
      {/* Two steps, always both visible. Knowing there is exactly one screen after
          this one is what stops the details form from feeling open-ended. */}
      <div className="mb-6 flex items-center gap-3">
        {["Your details", "Verify"].map((label, index) => {
          const state = step === "details" ? (index === 0 ? "current" : "upcoming") : index === 0 ? "done" : "current"
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  state === "done"
                    ? "bg-success text-white"
                    : state === "current"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {state === "done" ? <Check className="size-3.5" /> : index + 1}
              </div>
              <span
                className={`text-xs font-medium ${state === "upcoming" ? "text-muted-foreground" : "text-foreground"}`}
              >
                {label}
              </span>
              {index === 0 ? <div className="h-px flex-1 bg-border" /> : null}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === "verify" ? (
          <motion.div
            key="verify-step"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">
                {verifiedCount} of 2 checks done
                {isGoogleSignup ? " — Google confirmed your email" : ""}
              </p>
              <div className="flex gap-1.5">
                {[phoneVerified, emailVerified].map((done, index) => (
                  <div
                    key={index}
                    className={`h-1.5 w-8 rounded-full transition-colors ${done ? "bg-success" : "bg-border"}`}
                  />
                ))}
              </div>
            </div>

            <VerificationRow
              icon={Phone}
              label="Phone number"
              target={signupPhone}
              verified={phoneVerified}
            >
              <div className="space-y-3">
                <OtpCodeInput
                  value={otp}
                  onChange={next => {
                    setOtp(next)
                    if (otpInvalid) setOtpInvalid(false)
                  }}
                  onComplete={handleVerifyOtp}
                  disabled={verifyingOtp}
                  invalid={otpInvalid}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {verifyingOtp ? "Checking your code…" : "Enter the 6-digit code from the SMS"}
                  </p>
                  <button
                    type="button"
                    onClick={handleResendSms}
                    disabled={resendWaitSeconds > 0 || resendingSms}
                    className="shrink-0 text-xs font-semibold text-accent transition-colors hover:text-accent/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
                  >
                    {resendWaitSeconds > 0 ? `Resend in ${resendWaitSeconds}s` : resendingSms ? "Sending…" : "Resend code"}
                  </button>
                </div>
              </div>
            </VerificationRow>

            <VerificationRow icon={Mail} label="Email address" target={describeEmail(email)} verified={emailVerified}>
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                  <RefreshCw className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Open the link we sent — this page updates by itself, no need to come back and click anything.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendingEmail}
                  className="text-xs font-semibold text-accent transition-colors hover:text-accent/80 disabled:text-muted-foreground"
                >
                  {resendingEmail ? "Sending…" : "Resend email"}
                </button>
              </div>
            </VerificationRow>

            {creatingAccount ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-foreground">
                <Loader className="size-4 animate-spin text-primary" />
                Creating your account…
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Your account is created automatically once both checks are green.
              </p>
            )}

            <button
              type="button"
              onClick={handleStartOver}
              disabled={creatingAccount}
              className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Wrong details? Start over
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="details-step"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSignup}
            className="space-y-4"
          >
            {referralCode ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
                <Gift className="size-4 shrink-0 text-accent" />
                <p className="text-xs text-foreground/90">
                  You were invited with code <span className="font-mono font-semibold text-accent">{referralCode}</span>{" "}
                  — sign up to unlock your welcome bonus.
                </p>
              </div>
            ) : null}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Priya Sharma"
                  autoComplete="name"
                  className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                {isValidFullName(fullName) ? (
                  <CheckCircle2 className="absolute right-3 top-3.5 size-5 text-success" />
                ) : null}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="hello@sahasra.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                {email.includes("@") ? <CheckCircle2 className="absolute right-3 top-3.5 size-5 text-success" /> : null}
              </div>
              {/* Said before they type it, not after it fails: the address has to be
                  one they can open right now, and knowing that up front is what
                  prevents the typo this whole step exists to catch. */}
              <p className="mt-2 text-xs text-muted-foreground">
                We'll email you a link to confirm this address — use one you can open now.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
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
              {password ? (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${getPasswordStrengthColor()} transition-all`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground">{getPasswordStrengthText()}</span>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-3.5 flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-sm font-semibold">+91</span>
                  <Phone className="size-5" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  maxLength={10}
                  autoComplete="tel"
                  className="w-full rounded-xl border border-border bg-card py-3 pl-20 pr-10 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                {isValidE164Phone(signupPhone) ? (
                  <CheckCircle2 className="absolute right-3 top-3.5 size-5 text-success" />
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">We'll text you a one-time code to verify this number.</p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gender
              </label>
              <p className="mb-2 text-xs text-muted-foreground">
                Used to show you the right services, stylists and reward cards.
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGenderDropdown(value => !value)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
                >
                  <span className={gender ? "" : "text-muted-foreground"}>{gender || "Select gender"}</span>
                  <ChevronDown
                    className={`size-5 text-muted-foreground transition-transform ${showGenderDropdown ? "rotate-180" : ""}`}
                  />
                </button>
                {showGenderDropdown ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg"
                  >
                    {genderOptions.map((option, index) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setGender(option)
                          setShowGenderDropdown(false)
                        }}
                        className={`flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                          gender === option ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                        } ${index === 0 ? "rounded-t-xl" : ""} ${index === genderOptions.length - 1 ? "rounded-b-xl" : ""}`}
                      >
                        <span>{option}</span>
                        {gender === option ? <Check className="size-4" /> : null}
                      </button>
                    ))}
                  </motion.div>
                ) : null}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !detailsComplete}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader className="size-4 animate-spin" /> : null}
              {submitting ? "Sending your codes..." : "Continue"}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={submitting}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
            >
              Continue with Google
            </button>

            <p className="text-center text-xs text-muted-foreground">
              By signing up, you agree to our Terms of Service and Privacy Policy. Your account is created only after
              both your phone and email are verified.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthPageShell>
  )
}
