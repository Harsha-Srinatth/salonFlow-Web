export function getFirebaseAuthErrorMessage(error) {
  if (error instanceof Error) {
    if (error.message === "VERIFY_PHONE_FIRST") {
      return "Please complete phone verification before logging in."
    }
    if (error.message === "GOOGLE_ACCOUNT") {
      return "You registered with Google, so this account has no password. Please continue with Google."
    }
    if (error.message === "SET_PASSWORD_REQUIRED") {
      return "This account doesn't have a password yet. Use \"Forgot password?\" to set one."
    }
    if (error.message === "TOO_MANY_ATTEMPTS") {
      return "Too many failed sign-in attempts. Please wait a few minutes and try again."
    }
    if (error.message === "Invalid credentials") {
      return "Incorrect email or password. Check them and try again."
    }
    // What `fetch` throws when the API is unreachable, per browser.
    if (["Failed to fetch", "Load failed", "NetworkError when attempting to fetch resource."].includes(error.message)) {
      return "We couldn't reach the server. It may be waking up — please try again in a few seconds."
    }
    if (error.message === "ACCOUNT_NOT_FOUND" || error.message === "Phone number is required for registration") {
      return "No account found for this phone number. Please sign up first."
    }
    if (error.message === "EMAIL_NOT_VERIFIED") {
      return "Open the link we emailed you to confirm your address, then we'll finish creating your account."
    }
    if (error.message === "PHONE_NOT_VERIFIED") {
      return "Enter the code we sent by SMS to confirm your number."
    }
    if (error.message === "PHONE_MISMATCH") {
      return "That's not the number we verified. Go back and re-verify the number you want on the account."
    }
    if (error.message === "EMAIL_REQUIRED") {
      return "An email address is required to finish creating your account."
    }
  }

  const code =
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : ""

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password. Check them and try again."
    case "auth/user-not-found":
      return "No account found with this email."
    case "auth/wrong-password":
      return "Wrong password. Please try again."
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in."
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters."
    case "auth/invalid-email":
      return "Invalid email format."
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later."
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase."
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled. Try again when you're ready."
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in popup. Allow popups for this site and try again."
    case "auth/unauthorized-domain":
      return "Google sign-in isn't enabled for this site yet. Please contact the salon."

    // SMS code entry.
    case "auth/invalid-verification-code":
      return "That code isn't right. Check the SMS and try again."
    case "auth/code-expired":
      return "That code has expired. Tap Resend to get a new one."
    case "auth/missing-verification-code":
      return "Enter the 6-digit code from the SMS."
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "That phone number doesn't look right. Enter a 10-digit mobile number."

    // The number is spoken for. `credential-already-in-use` on signup means another
    // Firebase account already holds it, which the Postgres-only duplicate check
    // upstream cannot see.
    case "auth/credential-already-in-use":
    case "auth/account-exists-with-different-credential":
    case "auth/phone-number-already-exists":
      return "This phone number is already linked to another account. Sign in with it instead, or use a different number."

    // reCAPTCHA and project configuration. These used to reach the customer as raw
    // Firebase strings, which is a large part of why phone verification looked like
    // it failed for no reason — the cause is almost always a setup problem, and the
    // message needs to say something the person reading it can act on.
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
    case "auth/missing-app-credential":
      return "Verification check failed. Reload the page and try again — if it keeps happening, this site's domain may not be authorised for SMS sign-in."
    case "auth/invalid-recaptcha-token":
    case "auth/missing-recaptcha-token":
      return "The security check expired. Reload the page and request a new code."
    case "auth/quota-exceeded":
      return "We've hit today's SMS limit. Please try again later or sign up with Google."
    case "auth/billing-not-enabled":
      return "SMS verification isn't available right now. Please try again later or sign up with Google."
    case "auth/unsupported-first-factor":
    case "auth/operation-not-supported-in-this-environment":
      return "Phone verification isn't supported in this browser. Try a different browser, or sign up with Google."

    // Signup step transitions.
    case "auth/provider-already-linked":
      return "This number is already verified on your signup."
    case "auth/requires-recent-login":
      return "For security, please start signup again."
    case "auth/network-request-failed":
      return "Network problem. Check your connection and try again."
    case "auth/user-disabled":
      return "This account has been disabled. Please contact the salon."
    default:
      return error instanceof Error ? error.message : "Authentication failed."
  }
}
