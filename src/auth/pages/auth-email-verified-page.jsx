import { Link } from "react-router-dom"
import { CheckCircle2, Smartphone } from "lucide-react"
import { AuthPageShell } from "@/auth/components/auth-page-shell"

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
      sideDescription="Your email address is confirmed. Finish the SMS code and your account is ready."
      sideCards={[{ icon: CheckCircle2, text: "Email verified", sub: "Nothing else to do here" }]}
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-semibold text-foreground">Your email address is verified</p>
            <p className="mt-1 text-sm text-muted-foreground">You can close this tab.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <Smartphone className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">Go back to the signup tab</p>
            <p className="mt-1 text-sm text-muted-foreground">
              It picks this up by itself — enter the SMS code there and your account is created.
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Closed that tab?{" "}
          <Link to="/auth/signup" className="font-semibold text-accent hover:text-accent/80">
            Start signup again
          </Link>{" "}
          — your verified email is remembered.
        </p>
      </div>
    </AuthPageShell>
  )
}
