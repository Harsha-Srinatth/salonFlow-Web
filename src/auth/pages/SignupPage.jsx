import { GOOGLE_RATING } from "@/lib/public-claims";
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  Lock,
  Mail,
  MailCheck,
  MessageSquareText,
  Pencil,
  Phone,
  RotateCcw,
  Sparkles,
  Star,
  User,
  UserRound,
  Users,
  Wallet,
} from "lucide-react"
import { toast } from "@/lib/notify";
import { useAuth } from "@/components/auth/auth-provider"
import { AuthDivider, AuthPageShell, GoogleLogo } from "@/auth/components/auth-page-shell"
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
import { spring, variants } from "@/components/motion/presets"
import { AnimatedStepper } from "@/components/kit/animated-stepper"
import { BrandDots } from "@/components/kit/brand-loader"
import { ButtonLoadingMorph } from "@/components/kit/button-loading-morph"
import { FloatingLabelInput } from "@/components/kit/floating-label-input"
import { OtpInput } from "@/components/kit/otp-input"

const genderOptions = [
  { value: "Male", icon: User },
  { value: "Female", icon: UserRound },
  { value: "Other", icon: Users },
]

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
    <motion.div
      layout
      transition={spring.soft}
      className={`rounded-2xl p-4 ring-1 ring-inset transition-colors duration-300 ${verified ? "bg-success/10 ring-success/40" : "bg-card ring-border"}`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${verified ? "bg-success/15 text-ink-success" : "bg-muted text-ink-neutral"}`}>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span key={verified ? "ok" : "wait"} initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={spring.bouncy} className="grid">
              {verified ? <CheckCircle2 className="size-5" aria-hidden /> : <Icon className="size-5" aria-hidden />}
            </motion.span>
          </AnimatePresence>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{label}</p>
            {verified ? <span className="shrink-0 text-micro font-bold tracking-wider text-ink-success uppercase">Verified</span> : null}
          </div>
          <p className="mt-0.5 truncate text-caption text-ink-neutral">{target}</p>
          {verified ? null : <div className="mt-3">{children}</div>}
        </div>
      </div>
    </motion.div>
  )
}

/** Required choice, nothing preselected (see the comment on `gender` state). */
function GenderChoice({ value, onChange, disabled }) {
  return (
    <div>
      <p id="gender-label" className="mb-2 px-1 text-caption font-semibold text-ink-neutral">
        Gender
      </p>
      <div role="radiogroup" aria-labelledby="gender-label" className="grid grid-cols-3 gap-2">
        {genderOptions.map(({ value: option, icon: Icon }) => {
          const selected = value === option
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option)}
              className={`relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-control text-sm font-semibold ring-1 ring-inset transition-colors disabled:opacity-55 ${selected ? "text-portal-foreground ring-transparent" : "bg-card ring-border hover:bg-muted"}`}
            >
              {selected ? <motion.span layoutId="signup-gender-pill" className="absolute inset-0 rounded-control bg-portal shadow-glow" transition={spring.snappy} /> : null}
              <Icon className="relative size-4.5" aria-hidden />
              <span className="relative">{option}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 px-1 text-caption text-ink-neutral">Shows you the right services and stylists.</p>
    </div>
  )
}

const EMAIL_RE = /^\S+@\S+\.\S+$/

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
  // The OTP auto-submits on the sixth digit; a second confirm would burn one of the limited attempts.
  const verifyingRef = useRef(false)

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
    if (passwordStrength <= 3) return "bg-info"
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
      if (verifyingRef.current || verifyingOtp || phoneVerified) return
      verifyingRef.current = true
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
        verifyingRef.current = false
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

  const stepIndex = step === "verify" ? 1 : 0

  return (
    <AuthPageShell
      title={step === "verify" ? "Verify it's you" : "Create account"}
      subtitle={step === "verify" ? "Last step, then you're in." : "Already a member?"}
      subtitleLink={step === "verify" ? undefined : "/auth/login"}
      subtitleLinkLabel={step === "verify" ? undefined : "Sign in"}
      sideTitle="Join Sahasra"
      sideDescription="Book visits online, skip the guesswork and earn rewards."
      sideCards={[
        { icon: Star, text: GOOGLE_RATING.label },
        { icon: Gift, text: "Refer & earn" },
        { icon: Wallet, text: "Wallet credit" },
      ]}
    >
      <AnimatedStepper
        steps={[
          { id: "account", label: "Account", icon: User },
          { id: "verify", label: "Verify", icon: Phone },
        ]}
        current={stepIndex}
        className="mb-6"
      />

      <AnimatePresence mode="wait" initial={false}>
        {step === "verify" ? (
          <motion.div key="verify-step" variants={variants.fadeUp} initial="hidden" animate="show" exit="exit" className="space-y-4">
            {isGoogleSignup ? (
              <div className="flex items-center gap-3 rounded-2xl bg-success/10 p-4 ring-1 ring-inset ring-success/40">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card">
                  <GoogleLogo className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Signed in with Google</p>
                  <p className="truncate text-caption text-ink-neutral">{describeEmail(email)}</p>
                </div>
                <CheckCircle2 className="size-5 shrink-0 text-ink-success" aria-hidden />
              </div>
            ) : (
              <VerificationRow icon={Mail} label="Email" target={describeEmail(email)} verified={emailVerified}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="inline-flex items-center gap-2 text-caption text-ink-neutral">
                    <BrandDots className="text-portal" size={5} /> Open the link we emailed you
                  </p>
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={resendingEmail}
                    className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-ink-primary disabled:text-ink-neutral"
                  >
                    <MailCheck className="size-4" aria-hidden />
                    {resendingEmail ? "Sending…" : "Resend"}
                  </button>
                </div>
              </VerificationRow>
            )}

            {phoneVerified ? (
              <VerificationRow icon={Phone} label="Phone" target={signupPhone} verified />
            ) : (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {needsName ? (
                  <FloatingLabelInput
                    label="Full name"
                    icon={User}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    autoComplete="name"
                    disabled={otpSent}
                    success={isValidFullName(fullName)}
                  />
                ) : null}

                <FloatingLabelInput
                  label="Mobile number"
                  icon={Phone}
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                  autoComplete="tel-national"
                  disabled={otpSent}
                  hint="+91 · 10 digits"
                  success={isValidE164Phone(signupPhone)}
                />

                <GenderChoice value={gender} onChange={setGender} disabled={otpSent} />

                {!otpSent ? (
                  <ButtonLoadingMorph type="submit" state={sendingOtp ? "loading" : "idle"} icon={MessageSquareText} size="lg" fullWidth loadingLabel="Sending code…">
                    Send code
                  </ButtonLoadingMorph>
                ) : (
                  <motion.div variants={variants.scaleIn} initial="hidden" animate="show" className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-inset ring-border">
                    <p className="text-center text-sm font-semibold">Enter the 6-digit code sent to {signupPhone}</p>
                    <OtpInput
                      value={otp}
                      onChange={next => {
                        setOtp(next)
                        if (otpInvalid) setOtpInvalid(false)
                      }}
                      onComplete={handleVerifyOtp}
                      disabled={verifyingOtp}
                      error={otpInvalid ? "That code didn't match" : false}
                    />
                    {verifyingOtp ? (
                      <p className="flex items-center justify-center gap-2 text-caption text-ink-neutral" aria-live="polite">
                        <BrandDots className="text-portal" size={5} /> Checking your code…
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpSent(false)
                          setOtp("")
                          setOtpError("")
                        }}
                        className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-ink-neutral hover:text-foreground"
                      >
                        <Pencil className="size-4" aria-hidden /> Change number
                      </button>
                      <button
                        type="button"
                        onClick={handleResendSms}
                        disabled={resendWaitSeconds > 0 || sendingOtp}
                        className="inline-flex h-11 shrink-0 items-center gap-1.5 text-sm font-semibold text-ink-primary tabular-nums disabled:cursor-not-allowed disabled:text-ink-neutral"
                      >
                        <RotateCcw className="size-4" aria-hidden />
                        {resendWaitSeconds > 0 ? `Resend in ${resendWaitSeconds}s` : sendingOtp ? "Sending…" : "Resend"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {otpError ? (
                  <p role="alert" className="rounded-2xl bg-destructive/10 px-3 py-2.5 text-sm text-ink-destructive">
                    {otpError}
                  </p>
                ) : null}

                {attemptedPhone && missingPhoneStep.length && !otpSent ? (
                  <ul role="alert" className="space-y-1 rounded-2xl bg-destructive/10 px-3 py-2.5 text-sm text-ink-destructive">
                    {missingPhoneStep.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </form>
            )}

            {creatingAccount ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-portal/10 px-4 py-3 text-sm font-semibold" aria-live="polite">
                <BrandDots className="text-portal" /> Creating your account…
              </div>
            ) : phoneVerified && !emailVerified ? (
              <p className="text-center text-caption text-ink-neutral">Phone verified. Open the email link to finish.</p>
            ) : null}

            <button
              type="button"
              onClick={handleStartOver}
              disabled={creatingAccount}
              className="mx-auto flex h-11 items-center gap-1.5 text-sm font-semibold text-ink-neutral hover:text-foreground disabled:opacity-50"
            >
              <RotateCcw className="size-4" aria-hidden /> Wrong details? Start over
            </button>
          </motion.div>
        ) : (
          <motion.form key="details-step" variants={variants.fadeUp} initial="hidden" animate="show" exit="exit" onSubmit={handleSignup} className="space-y-4">
            {referralCode ? (
              <motion.div variants={variants.scaleIn} initial="hidden" animate="show" className="flex items-center gap-3 rounded-2xl bg-gold/12 px-4 py-3 ring-1 ring-inset ring-gold/40">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/20 text-gold">
                  <Gift className="size-5" aria-hidden />
                </span>
                <p className="text-sm">
                  Invited with <span className="font-mono font-bold tracking-wider">{referralCode}</span>. Sign up to unlock your welcome bonus.
                </p>
              </motion.div>
            ) : null}

            <ButtonLoadingMorph variant="outline" size="lg" fullWidth onClick={handleGoogleSignup} disabled={submitting}>
              <GoogleLogo /> Continue with Google
            </ButtonLoadingMorph>

            <AuthDivider label="or with email" />

            <FloatingLabelInput label="Full name" icon={User} value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" success={isValidFullName(fullName)} />
            <FloatingLabelInput
              label="Email"
              icon={Mail}
              type="email"
              inputMode="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              hint="We'll email a link to confirm it"
              success={EMAIL_RE.test(email.trim())}
            />
            <div>
              <FloatingLabelInput label="Password" icon={Lock} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" hint={password ? undefined : "8+ characters"} />
              {password ? (
                <div className="mt-2 flex items-center gap-2 px-1 text-caption">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full origin-left rounded-full ${getPasswordStrengthColor()} transition-transform duration-500 ease-[var(--ease-out-expo)]`}
                      style={{ transform: `scaleX(${passwordStrength / 5})` }}
                    />
                  </div>
                  <span className="w-12 text-right font-semibold text-ink-neutral">{getPasswordStrengthText()}</span>
                </div>
              ) : null}
            </div>

            <ButtonLoadingMorph type="submit" state={submitting ? "loading" : "idle"} size="lg" fullWidth loadingLabel="Please wait…">
              Continue <ArrowRight className="size-4" aria-hidden />
            </ButtonLoadingMorph>

            {attemptedAccount && missingAccount.length ? (
              <ul role="alert" className="space-y-1 rounded-2xl bg-destructive/10 px-3 py-2.5 text-sm text-ink-destructive">
                {missingAccount.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            <p className="flex items-start gap-2 text-center text-caption text-ink-neutral">
              <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              By signing up you agree to our Terms of Service and Privacy Policy. Next, you'll verify your phone.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthPageShell>
  )
}
