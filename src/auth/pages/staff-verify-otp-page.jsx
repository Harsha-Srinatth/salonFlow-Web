import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Loader, Phone, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { AuthPageShell } from "@/auth/components/auth-page-shell"
import { isValidE164Phone, toE164Phone } from "@/auth/lib/phone"
import {
  assertCanSendOtp,
  assertOtpVerifyNotLocked,
  clearOtpVerifyGuards,
  recordOtpSend,
  recordOtpVerifyFailure,
} from "@/lib/otp-throttle"
import { confirmStaffFirebasePhoneOtp, sendStaffFirebasePhoneOtp } from "@/lib/auth/auth-client"
import { verifyStaffPhoneWithFirebaseIdToken } from "@/lib/staff-auth-client"

const SETUP_TOKEN_KEY = "staff_setup_token"

export default function StaffVerifyOtpPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [smsSent, setSmsSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const queryPhone = new URLSearchParams(window.location.search).get("phone")
    if (queryPhone) setPhone(decodeURIComponent(queryPhone).replace(/\D/g, "").slice(-10))
  }, [])

  async function handleSendSms(event) {
    event.preventDefault()
    const e164 = toE164Phone(phone)
    if (!isValidE164Phone(e164)) {
      toast.error("Enter a valid 10-digit phone number (must match admin record)")
      return
    }

    setSubmitting(true)
    try {
      assertCanSendOtp("staff", e164)
      await sendStaffFirebasePhoneOtp(e164)
      recordOtpSend("staff", e164)
      setSmsSent(true)
      toast.success("SMS sent — enter the code from Firebase")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send SMS")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyFirebase(event) {
    event.preventDefault()
    const e164 = toE164Phone(phone)
    if (!otp.trim()) {
      toast.error("Enter the SMS code")
      return
    }

    setSubmitting(true)
    try {
      assertOtpVerifyNotLocked("staff", e164)
      const idToken = await confirmStaffFirebasePhoneOtp(otp.trim())
      const setupToken = await verifyStaffPhoneWithFirebaseIdToken(idToken)
      clearOtpVerifyGuards("staff", e164)
      window.sessionStorage.setItem(SETUP_TOKEN_KEY, setupToken)
      toast.success("Phone verified — set your password")
      navigate("/staff/set-password")
    } catch (error) {
      recordOtpVerifyFailure("staff", e164)
      toast.error(error instanceof Error ? error.message : "Verification failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageShell
      title="Verify phone (staff)"
      subtitle="Already verified?"
      subtitleLink="/auth/login"
      subtitleLinkLabel="Back to sign in"
      sideTitle="Staff onboarding"
      sideDescription="Firebase sends the SMS code to the number your admin saved. Use the exact same phone."
      sideCards={[
        { icon: ShieldCheck, text: "Secure setup", sub: "One-time phone verification" },
        { icon: Phone, text: "E.164 format", sub: "Example: +919876543210" },
      ]}
    >
      <form onSubmit={smsSent ? handleVerifyFirebase : handleSendSms} className="space-y-4">
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
              disabled={smsSent}
              autoComplete="tel"
              className="w-full rounded-xl border border-border bg-card py-3 pl-20 pr-4 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 disabled:opacity-60"
            />
          </div>
        </div>

        {smsSent ? (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SMS code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              placeholder="Enter code from SMS"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? <Loader className="size-4 animate-spin" /> : null}
          {submitting ? "Please wait…" : smsSent ? "Verify & continue" : "Send SMS code"}
        </button>

        {smsSent ? (
          <button
            type="button"
            onClick={() => {
              setSmsSent(false)
              setOtp("")
            }}
            className="w-full text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Use a different number
          </button>
        ) : null}
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/auth/login" className="font-semibold text-primary hover:text-primary/80">
          Back to staff login
        </Link>
      </p>

      <div id="staff-recaptcha-container" />
    </AuthPageShell>
  )
}
