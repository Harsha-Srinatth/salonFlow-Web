import { GOOGLE_RATING } from "@/lib/public-claims";
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import {
  Award,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
} from "lucide-react"
import { toast } from "@/lib/notify";
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
import { InlineOrb } from "@/components/shared/loading-orb"

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

const EMAIL_RE = /^\S+@\S+\.\S+$/

function GoogleLogo({ className = "size-5" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
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
  const [attemptedAccount, setAttemptedAccount] = useState(false)
  const [attemptedPhone, setAttemptedPhone] = useState(false)

  // "details" = name, email, password (or Google). "verify" = phone + gender + SMS code.
  const [step, setStep] = useState("details")
  const [otpSent, setOtpSent] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [otp, setOtp] = useState("")
  const [otpInvalid, setOtpInvalid] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
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

  // Step 1: what is still missing, in form order.
  const missingAccount = [
    !isValidFullName(fullName) && "First and last name (letters only)",
    !EMAIL_RE.test(email.trim()) && "A valid email",
    password.length < 8 && "A password of 8+ characters",
  ].filter(Boolean)

  // Step 2: a Google profile name that fails our name rule has to be typed here.
  const needsName = !isValidFullName(fullName)
  const missingPhoneStep = [
    needsName && "First and last name (letters only)",
    !isValidE164Phone(signupPhone) && "A 10-digit phone number",
    !mapGenderToApi(gender) && "Your gender",
  ].filter(Boolean)

  /** Live countdown on the resend button, so the wait is visible instead of only being announced after a refused tap. */
  useEffect(() => {
    if (step !== "verify" || !otpSent || phoneVerified) return undefined
    const tick = () => setResendWaitSeconds(Math.ceil(getOtpResendWaitMs("customer", signupPhone) / 1000))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [step, otpSent, phoneVerified, signupPhone])

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

  function stashPendingSignup() {
    setPendingSignupRole("USER")
    setPendingSignupName(fullName.trim())
    setPendingSignupPhone(signupPhone)
    setPendingSignupGender(mapGenderToApi(gender))
    if (referralCode) setPendingSignupReferralCode(referralCode)
  }

  const finishSignup = useCallback(async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    setCreatingAccount(true)
    try {
      // Re-stashed here so the registration always carries what is on screen now.
      stashPendingSignup()
      const appUserResult = await completeVerifiedSignup(isGoogleSignup ? undefined : password)
      clearOtpVerifyGuards("customer", signupPhone)
      // Before navigating, not after: the dashboard is behind a role guard that
      // reads the *provider's* user, and this page registered the account through
      // the client directly. Landing there while the context still says "signed
      // out" bounces the customer to login seconds after creating their account.
      await refresh()
      toast.success("You're all set, welcome to Sahasra!")
      navigate(appUserResult?.role ? getDashboardPathByRole(appUserResult.role) : "/auth/login", { replace: true })
    } catch (error) {
      // Leaving the flag set would strand them on a screen with everything
      // verified and no way to retry.
      finishedRef.current = false
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setCreatingAccount(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogleSignup, password, signupPhone, fullName, gender, navigate, refresh])

  /**
   * The account is created the instant the phone (and, for email signups, the
   * emailed link) is confirmed. There is no final "create account" button: by
   * this point the customer has passed every challenge.
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
    setOtpSent(true)
    setOtp("")
    setOtpInvalid(false)
    toast.success("Code sent by SMS")
  }

  /** Step 1, email route: creates the sign-in and mails the confirmation link. */
  async function handleSignup(event) {
    event.preventDefault()
    setAttemptedAccount(true)
    if (missingAccount.length) return

    setSubmitting(true)
    try {
      if (await emailExists(email)) {
        toast.error("This email is already registered. Please sign in instead.")
        return
      }
      setPendingSignupRole("USER")
      setPendingSignupName(fullName.trim())
      if (referralCode) setPendingSignupReferralCode(referralCode)
      const { resumed } = await startEmailSignup(email.trim(), password)
      setIsGoogleSignup(false)
      setEmailVerified(false)
      setPhoneVerified(false)
      setOtpSent(false)
      setStep("verify")
      if (resumed) toast.info("Picking up where you left off. We sent the email link again.")
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  /** Step 1, Google route: nothing to type first, the phone is asked for on the next step. */
  async function handleGoogleSignup() {
    setSubmitting(true)
    try {
      setPendingSignupRole("USER")
      if (referralCode) setPendingSignupReferralCode(referralCode)
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
      const googleName = `${googleUser.displayName ?? ""}`.trim()
      if (!isValidFullName(fullName) && isValidFullName(googleName)) setFullName(googleName)
      setIsGoogleSignup(true)
      // Google hands back a verified address; re-challenging it would be asking
      // the customer to prove something the provider already proved.
      setEmailVerified(Boolean(googleUser.emailVerified))
      setPhoneVerified(false)
      setOtpSent(false)
      setStep("verify")
    } catch (error) {
      await cancelPendingSignup().catch(() => undefined)
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  /** Step 2: send the SMS. Failures are shown on the page, not only in a toast that disappears. */
  async function handleSendOtp(event) {
    event?.preventDefault()
    setAttemptedPhone(true)
    if (missingPhoneStep.length) return

    setSendingOtp(true)
    setOtpError("")
    try {
      if (await phoneExists(signupPhone)) {
        setOtpError("This phone number is already registered. Sign in instead.")
        return
      }
      stashPendingSignup()
      await startPhoneVerification(signupPhone)
    } catch (error) {
      const message = getFirebaseAuthErrorMessage(error)
      setOtpError(message)
      toast.error(message)
    } finally {
      setSendingOtp(false)
    }
  }

  async function handleResendSms() {
    if (resendWaitSeconds > 0) return
    setSendingOtp(true)
    setOtpError("")
    try {
      await startPhoneVerification(signupPhone)
    } catch (error) {
      const message = getFirebaseAuthErrorMessage(error)
      setOtpError(message)
      toast.error(message)
    } finally {
      setSendingOtp(false)
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

  /** Drops the half-finished Firebase account so the first step starts clean. */
  async function handleStartOver() {
    await cancelPendingSignup()
    destroyRecaptcha()
    finishedRef.current = false
    setStep("details")
    setOtpSent(false)
    setOtpError("")
    setOtp("")
    setOtpInvalid(false)
    setPhoneVerified(false)
    setEmailVerified(false)
    setIsGoogleSignup(false)
    setAttemptedPhone(false)
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-card py-3 pl-10 pr-10 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
  const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"

  return (
    <AuthPageShell
      title={step === "verify" ? "Verify your phone" : "Create account"}
      subtitle={step === "verify" ? "Last step, then you're in." : "Already have an account?"}
      subtitleLink={step === "verify" ? undefined : "/auth/login"}
      subtitleLinkLabel={step === "verify" ? undefined : "Sign in"}
      sideTitle="Join Sahasra"
      sideDescription="Book premium salon appointments and enjoy exclusive member benefits."
      sideCards={[
        { icon: Sparkles, text: "Luxury Experience", sub: "Premium salon services" },
        { icon: CheckCircle, text: "Easy Booking", sub: "Book in 60 seconds" },
        { icon: Award, text: "Refer & earn", sub: "Wallet credit for referrals" },
      ]}
      sideFooter={
        <div className="grid w-full max-w-xs grid-cols-2 gap-3 text-center">
          {[
            { num: GOOGLE_RATING.reviews, text: "Google reviews" },
            { num: `${GOOGLE_RATING.value}/5`, text: "Google rating" },
          ].map(stat => (
            <div key={stat.text} className="rounded-lg border border-border bg-card/50 p-3 backdrop-blur-sm">
              <p className="font-display text-lg font-bold text-primary">{stat.num}</p>
              <p className="text-xs text-muted-foreground">{stat.text}</p>
            </div>
          ))}
        </div>
      }
    >
      {/* Two steps, always both visible. */}
      <div className="mb-6 flex items-center gap-3">
        {["Account", "Verify phone"].map((label, index) => {
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
            {/* Which sign-in this account is being built on, and whether the email half is done */}
            {isGoogleSignup ? (
              <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/5 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card">
                  <GoogleLogo className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Signed in with Google</p>
                  <p className="truncate text-xs text-muted-foreground">{describeEmail(email)}</p>
                </div>
                <CheckCircle2 className="size-5 shrink-0 text-success" />
              </div>
            ) : (
              <VerificationRow icon={Mail} label="Email address" target={describeEmail(email)} verified={emailVerified}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                    <InlineOrb />
                    <p className="text-xs text-muted-foreground">
                      Open the link we emailed you. This page updates by itself.
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
            )}

            {phoneVerified ? (
              <VerificationRow icon={Phone} label="Phone number" target={signupPhone} verified />
            ) : (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {needsName ? (
                  <div>
                    <label className={labelClass}>Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Priya Sharma"
                        autoComplete="name"
                        disabled={otpSent}
                        className={inputClass}
                      />
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className={labelClass}>Phone</label>
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
                      disabled={otpSent}
                      className={`${inputClass} pl-20`}
                    />
                    {isValidE164Phone(signupPhone) ? (
                      <CheckCircle2 className="absolute right-3 top-3.5 size-5 text-success" />
                    ) : null}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Gender</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowGenderDropdown(value => !value)}
                      disabled={otpSent}
                      className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    Used to show you the right services, stylists and reward cards.
                  </p>
                </div>

                {!otpSent ? (
                  <button
                    type="submit"
                    disabled={sendingOtp}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sendingOtp ? <InlineOrb theme="light" /> : <Phone className="size-4" />}
                    {sendingOtp ? "Sending code..." : "Send verification code"}
                  </button>
                ) : (
                  <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">Enter the 6-digit code sent to {signupPhone}</p>
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
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false)
                          setOtp("")
                          setOtpError("")
                        }}
                        className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Change number
                      </button>
                      <button
                        type="button"
                        onClick={handleResendSms}
                        disabled={resendWaitSeconds > 0 || sendingOtp}
                        className="shrink-0 text-xs font-semibold text-accent transition-colors hover:text-accent/80 disabled:cursor-not-allowed disabled:text-muted-foreground"
                      >
                        {resendWaitSeconds > 0 ? `Resend in ${resendWaitSeconds}s` : sendingOtp ? "Sending…" : "Resend code"}
                      </button>
                    </div>
                    {verifyingOtp ? (
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <InlineOrb /> Checking your code…
                      </p>
                    ) : null}
                  </div>
                )}

                {otpError ? (
                  <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    {otpError}
                  </p>
                ) : null}

                {attemptedPhone && missingPhoneStep.length && !otpSent ? (
                  <ul role="alert" className="space-y-1 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    {missingPhoneStep.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </form>
            )}

            {creatingAccount ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-foreground">
                <InlineOrb />
                Creating your account…
              </div>
            ) : phoneVerified && !emailVerified ? (
              <p className="text-center text-xs text-muted-foreground">
                Phone verified. Open the email link to finish creating your account.
              </p>
            ) : null}

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
                  You were invited with code{" "}
                  <span className="font-sans font-semibold tabular-nums text-accent">{referralCode}</span>. Sign up to
                  unlock your welcome bonus.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
            >
              <GoogleLogo />
              Continue with Google
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">Or sign up with email</span>
              </div>
            </div>

            <div>
              <label className={labelClass}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Priya Sharma"
                  autoComplete="name"
                  className={inputClass}
                />
                {isValidFullName(fullName) ? (
                  <CheckCircle2 className="absolute right-3 top-3.5 size-5 text-success" />
                ) : null}
              </div>
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="hello@sahasra.com"
                  autoComplete="email"
                  className={inputClass}
                />
                {EMAIL_RE.test(email.trim()) ? (
                  <CheckCircle2 className="absolute right-3 top-3.5 size-5 text-success" />
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                We'll email you a link to confirm this address. Use one you can open now.
              </p>
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 size-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className={inputClass}
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

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <InlineOrb theme="light" /> : null}
              {submitting ? "Please wait..." : "Continue"}
            </button>

            {attemptedAccount && missingAccount.length ? (
              <ul role="alert" className="space-y-1 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {missingAccount.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            <p className="text-center text-xs text-muted-foreground">
              By signing up, you agree to our Terms of Service and Privacy Policy. Next you'll verify your phone number.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthPageShell>
  )
}
