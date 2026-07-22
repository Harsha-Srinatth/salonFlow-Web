export function getFirebaseAuthErrorMessage(error) {
  if (error instanceof Error) {
    if (error.message === "VERIFY_PHONE_FIRST") {
      return "Please complete phone verification before logging in."
    }
    if (error.message === "SET_PASSWORD_REQUIRED") {
      return "Please set your app password before logging in."
    }
    if (error.message === "TOO_MANY_ATTEMPTS") {
      return "Too many failed sign-in attempts. Please wait a few minutes and try again."
    }
    if (error.message === "Invalid credentials") {
      return "Invalid email or password."
    }
  }

  const code =
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : ""

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Invalid email or password."
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
      return "Google sign-in popup was closed before completion."
    case "auth/popup-blocked":
      return "Popup blocked by browser. Please allow popups and try again."
    default:
      return error instanceof Error ? error.message : "Authentication failed."
  }
}
