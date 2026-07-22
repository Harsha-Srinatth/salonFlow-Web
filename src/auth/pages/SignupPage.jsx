import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Award,
  Check,
  CheckCircle,
  ChevronDown,
  Eye,
  EyeOff,
  Loader,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth/auth-provider"
import { AuthPageShell } from "@/auth/components/auth-page-shell"
import { getFirebaseAuthErrorMessage } from "@/auth/lib/auth-errors"
import { isValidE164Phone, toE164Phone } from "@/auth/lib/phone"
import { isValidFullName, mapGenderToApi } from "@/auth/lib/validation"
import { getDashboardPathByRole } from "@/lib/auth/role-routing"
import {
  phoneExists,
  setPendingSignupGender,
  setPendingSignupName,
  setPendingSignupPhone,
  setPendingSignupRole,
  signInWithGoogle,
  signUpWithEmail,
  syncSessionWithBackend,
} from "@/lib/auth/auth-client"

const genderOptions = ["Male", "Female", "Other"]

function calculatePasswordStrength(password) {
  let strength = 0
  if (password.length >= 8) strength += 1
  if (/[a-z]+/.test(password)) strength += 1
  if (/[A-Z]+/.test(password)) strength += 1
  if (/[0-9]+/.test(password)) strength += 1
  if (/[@$!%*?&]+/.test(password)) strength += 1
  return strength
}

export default function SignupPage() {
  const navigate = useNavigate()
  const { appUser, loading } = useAuth()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [gender, setGender] = useState("Other")
  const [showPassword, setShowPassword] = useState(false)
  const [showGenderDropdown, setShowGenderDropdown] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  useEffect(() => {
    if (loading || !appUser?.role) return
    if (["ADMIN", "USER", "STAFF", "RECEPTIONIST"].includes(appUser.role)) {
      navigate(getDashboardPathByRole(appUser.role), { replace: true })
    }
  }, [appUser, loading, navigate])

  function handlePasswordChange(event) {
    const value = event.target.value
    setPassword(value)
    setPasswordStrength(calculatePasswordStrength(value))
  }

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
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    const signupPhone = toE164Phone(phone)
    if (!isValidE164Phone(signupPhone)) {
      toast.error("Enter a valid 10-digit phone number")
      return
    }

    const alreadyExists = await phoneExists(signupPhone)
    if (alreadyExists) {
      toast.error("Phone already registered. Sign in with OTP, then use Forgot Password to set your password.")
      return
    }

    setSubmitting(true)
    try {
      setPendingSignupRole("USER")
      setPendingSignupName(fullName.trim())
      setPendingSignupPhone(signupPhone)
      setPendingSignupGender(mapGenderToApi(gender))
      const user = await signUpWithEmail(email, password)
      toast.success(`Verification email sent to ${user.email}`)
      navigate("/auth/login", { replace: true })
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

    const signupPhone = toE164Phone(phone)
    if (!isValidE164Phone(signupPhone)) {
      toast.error("Enter a valid phone number before Google signup")
      return
    }

    const alreadyExists = await phoneExists(signupPhone)
    if (alreadyExists) {
      toast.error("Phone already registered. Please sign in instead.")
      return
    }

    setSubmitting(true)
    try {
      setPendingSignupName(fullName.trim())
      setPendingSignupPhone(signupPhone)
      setPendingSignupGender(mapGenderToApi(gender))
      await signInWithGoogle()
      const syncedUser = await syncSessionWithBackend()
      if (syncedUser?.role) {
        navigate(getDashboardPathByRole(syncedUser.role), { replace: true })
      }
      toast.success("Google signup successful")
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell
      title="Create account"
      subtitle="Already have an account?"
      subtitleLink="/auth/login"
      subtitleLinkLabel="Sign in"
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
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSignup}
        className="space-y-4"
      >
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
              className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
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
              onChange={handlePasswordChange}
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
              className="w-full rounded-xl border border-border bg-card py-3 pl-20 pr-4 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Gender
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowGenderDropdown(value => !value)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <span>{gender}</span>
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
          disabled={submitting}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? <Loader className="size-4 animate-spin" /> : null}
          {submitting ? "Creating account..." : "Sign up with Email"}
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
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.form>
    </AuthPageShell>
  )
}
