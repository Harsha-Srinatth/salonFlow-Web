import { Link } from "react-router-dom"
import { ArrowLeftRight, MailCheck, RotateCcw, Smartphone } from "lucide-react"
import { AuthPageShell } from "@/auth/components/auth-page-shell"
import { SuccessBurst } from "@/components/motion/success-burst"

/**
 * Where Firebase's email verification link lands.
 *
 * Its whole job is to tell the reader they can stop. The link is almost always
 * opened from a mail app, in a browser that has none of the signup state — so
 * this page cannot continue the signup, and pretending otherwise (dropping them
 * on the signup form, which would restart from an empty first step) is what makes
 * people think the click did not register. The tab they started in is already
 * watching for this and finishes on its own.
 */
export default function AuthEmailVerifiedPage() {
  return (
    <AuthPageShell
      title="Email confirmed"
      subtitle="That's one of the two checks done."
      sideTitle="Almost there"
      sideDescription="Your email is confirmed. Finish the SMS code and your account is ready."
      sideCards={[
        { icon: MailCheck, text: "Email verified" },
        { icon: Smartphone, text: "SMS code next" },
      ]}
    >
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <SuccessBurst size={88} label="Email verified" />
          <p className="font-semibold">You can close this tab</p>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-inset ring-border">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-portal/12 text-ink-primary">
            <ArrowLeftRight className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold">Back to the signup tab</p>
            <p className="mt-0.5 text-caption text-ink-neutral">It picks this up by itself. Enter the SMS code there.</p>
          </div>
        </div>

        <p className="text-center text-sm text-ink-neutral">
          Closed it?{" "}
          <Link to="/auth/signup" className="tap inline-flex items-center gap-1 font-semibold text-ink-primary">
            <RotateCcw className="size-3.5" aria-hidden /> Start signup again
          </Link>
          <span className="block text-caption">Your verified email is remembered.</span>
        </p>
      </div>
    </AuthPageShell>
  )
}
