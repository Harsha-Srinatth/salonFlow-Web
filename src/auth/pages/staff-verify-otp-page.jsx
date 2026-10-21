import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowLeft, MessageSquareText, Pencil, Phone, ShieldCheck, Smartphone } from "lucide-react"
import { toast } from "@/lib/notify";
import { AuthPageShell } from "@/auth/components/auth-page-shell"
import { isValidE164Phone, toE164Phone } from "@/auth/lib/phone"
import {
  assertCanSendOtp,
  assertOtpVerifyNotLocked,
  clearOtpVerifyGuards,
  recordOtpSend,
  recordOtpVerifyFailure,
} from "@/lib/otp-throttle"
import { sendStaffWhatsAppOtp, verifyStaffWhatsAppOtp } from "@/lib/auth/auth-client"
import { ButtonLoadingMorph } from "@/components/kit/button-loading-morph"
import { FloatingLabelInput } from "@/components/kit/floating-label-input"
import { OtpInput } from "@/components/kit/otp-input"

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
      await sendStaffWhatsAppOtp(e164)
      recordOtpSend("staff", e164)
      setSmsSent(true)
      toast.success("Code sent on WhatsApp")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send the code")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyFirebase(event, code = otp) {
    event?.preventDefault()
    const e164 = toE164Phone(phone)
    if (!code.trim() || submitting) {
      toast.error("Enter the code from WhatsApp")
      return
    }

    setSubmitting(true)
    try {
      assertOtpVerifyNotLocked("staff", e164)
      const setupToken = await verifyStaffWhatsAppOtp(e164, code.trim())
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
      title="Verify your phone"
      subtitle="Already verified?"
      subtitleLink="/auth/login"
      subtitleLinkLabel="Sign in"
      sideTitle="Staff setup"
      sideDescription="Use the exact number your admin saved. We'll send you a code on WhatsApp."
      sideCards={[
        { icon: ShieldCheck, text: "One-time check" },
        { icon: Smartphone, text: "Same phone as admin record" },
      ]}
      footer={
        <Link to="/auth/login" className="inline-flex h-11 items-center gap-1.5 font-semibold text-ink-primary">
          <ArrowLeft className="size-4" aria-hidden /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={smsSent ? handleVerifyFirebase : handleSendSms} className="space-y-4">
        <FloatingLabelInput
          label="Mobile number"
          icon={Phone}
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          maxLength={10}
          disabled={smsSent}
          autoComplete="tel-national"
          hint="+91 · 10 digits"
          success={phone.length === 10}
        />

        {smsSent ? (
          <div className="space-y-2">
            <p className="text-center text-sm text-ink-neutral">Enter the code we sent on WhatsApp</p>
            <OtpInput value={otp} onChange={setOtp} onComplete={code => void handleVerifyFirebase(undefined, code)} disabled={submitting} />
          </div>
        ) : null}

        <ButtonLoadingMorph type="submit" state={submitting ? "loading" : "idle"} icon={smsSent ? ShieldCheck : MessageSquareText} size="lg" fullWidth loadingLabel="Please wait…">
          {smsSent ? "Verify & continue" : "Send code"}
        </ButtonLoadingMorph>

        {smsSent ? (
          <button
            type="button"
            onClick={() => {
              setSmsSent(false)
              setOtp("")
            }}
            className="mx-auto flex h-11 items-center gap-1.5 text-sm font-semibold text-ink-neutral hover:text-foreground"
          >
            <Pencil className="size-4" aria-hidden /> Use a different number
          </button>
        ) : null}
      </form>
    </AuthPageShell>
  )
}
