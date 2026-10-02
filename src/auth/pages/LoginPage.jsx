import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Award,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Star,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthPageShell } from "@/auth/components/auth-page-shell"
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
import { InlineOrb } from "@/components/shared/loading-orb"

const ACCOUNT_NOT_FOUND_MESSAGES = new Set(["ACCOUNT_NOT_FOUND", "Phone number is required for registration"])

export default function LoginPage() {
  const navigate = useNavigate()
  const { appUser, loading, refresh } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState("email")
  const [submitting, setSubmitting] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState("")

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

      await refresh()
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

  async function handleVerifyOtp(event) {
    event.preventDefault()
    const e164 = toE164Phone(phone)
    if (!otp.trim()) {
      toast.error("Enter OTP code")
      return
    }

    setSubmitting(true)
    try {
      assertOtpVerifyNotLocked("customer", e164)
      const result = await verifyPhoneOtp(otp.trim())
      clearOtpVerifyGuards("customer", e164)
      if (result.appUser?.role) {
        toast.success("Phone verified and signed in")
        navigate(getDashboardPathByRole(result.appUser.role), { replace: true })
      } else {
        toast.error("No account found for this phone number. Please sign up first.")
        navigate("/auth/signup", { replace: true, state: { phone } })
      }
    } catch (error) {
      recordOtpVerifyFailure("customer", e164)
      if (error instanceof Error && ACCOUNT_NOT_FOUND_MESSAGES.has(error.message)) {
        toast.error("No account found for this phone number. Please sign up first.")
        navigate("/auth/signup", { replace: true, state: { phone } })
        return
      }
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setSubmitting(true)
    try {
      await signInWithGoogle()
      const syncedUser = await syncSessionWithBackend()
      if (syncedUser?.role) {
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

  return (
    <AuthPageShell
      title="Sign in"
      subtitle="Don't have an account?"
      subtitleLink="/auth/signup"
      subtitleLinkLabel="Sign up"
      sideTitle="Welcome Back"
      sideDescription="Your perfect salon experience awaits. Login to continue booking."
      sideCards={[
        { icon: Star, text: "4.8/5 Rating", sub: "500+ customers" },
        { icon: CheckCircle, text: "Instant Booking", sub: "In under 60 seconds" },
        { icon: Award, text: "Premium Service", sub: "Expert stylists" },
      ]}
      sideFooter={
        <div className="rounded-2xl border border-border bg-card/50 p-6 backdrop-blur-sm">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="size-4 fill-primary text-primary" />
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            &ldquo;Best salon experience ever! The booking was smooth and the service was exceptional.&rdquo;
          </p>
          <p className="mt-3 text-sm font-semibold text-foreground">— Priya Sharma</p>
        </div>
      }
    >
      <div className="mb-8 flex gap-2 rounded-xl border border-border bg-card/50 p-1">
        {["email", "phone"].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab)
              setOtpSent(false)
              setOtp("")
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "email" ? "Email" : "Phone OTP"}
          </button>
        ))}
      </div>

      {activeTab === "email" ? (
        <motion.form
          key="email-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleEmailLogin}
          className="space-y-4"
        >
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
                className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
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
                autoComplete="current-password"
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
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? <InlineOrb theme="light" /> : null}
            {submitting ? "Signing in..." : "Sign in with Email"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={submitting}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </button>
          </div>
        </motion.form>
      ) : (
        <motion.form
          key="phone-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
          className="space-y-4"
        >
          {!otpSent ? (
            <>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone Number
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
                    className="w-full rounded-xl border border-border bg-card py-3 pl-20 pr-4 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <InlineOrb theme="light" /> : null}
                {submitting ? "Sending OTP..." : "Send OTP"}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Enter OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full rounded-xl border border-border bg-card px-4 py-3 text-center font-mono text-lg tracking-widest text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <InlineOrb theme="light" /> : null}
                {submitting ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false)
                  setOtp("")
                }}
                className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Edit phone number
              </button>
            </>
          )}
        </motion.form>
      )}

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
        onClick={handleGoogleLogin}
        disabled={submitting}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-70"
      >
        Continue with Google
      </button>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Staff first time?{" "}
        <Link to="/staff/verify-otp" className="font-semibold text-primary hover:text-primary/80">
          Verify phone &amp; set password
        </Link>
      </p>

    </AuthPageShell>
  )
}
