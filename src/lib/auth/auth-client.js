import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import { toApiUrl } from "@/lib/api-base";
import { clearBrowserSessionState, clearServerSessions, handleUnauthorizedStatus } from "@/lib/auth/session-manager";
import { getDeviceId } from "@/lib/device-id";
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, } from "firebase/auth";
const PENDING_SIGNUP_ROLE_KEY = "pending_signup_role";
const PENDING_SIGNUP_PHONE_KEY = "pending_signup_phone";
const PENDING_SIGNUP_NAME_KEY = "pending_signup_name";
const PENDING_SIGNUP_GENDER_KEY = "pending_signup_gender";
const PENDING_SIGNUP_REFERRAL_KEY = "pending_signup_referral";
const PENDING_VERIFIED_PHONE_KEY = "pending_verified_phone";
const SIGNUP_IN_PROGRESS_KEY = "signup_in_progress";
const PENDING_PHONE_PROOF_KEY = "pending_phone_proof";
const PENDING_PHONE_PROOF_PHONE_KEY = "pending_phone_proof_phone";
/**
 * Whether a signup is mid-verification in this tab.
 *
 * Signup holds a real Firebase session from its first step, long before the
 * account exists — so the usual "a Firebase user appeared, go fetch their app
 * profile" reflex in `AuthProvider` would fire against a registration that is
 * *designed* to be refused until both factors land. This flag lets that reflex
 * stand down. Kept in sessionStorage rather than a module variable so a reload
 * mid-signup does not resurrect the problem.
 */
export function isSignupInProgress() {
    if (typeof window === "undefined")
        return false;
    return window.sessionStorage.getItem(SIGNUP_IN_PROGRESS_KEY) === "1";
}
function markSignupInProgress(active) {
    if (typeof window === "undefined")
        return;
    if (active)
        window.sessionStorage.setItem(SIGNUP_IN_PROGRESS_KEY, "1");
    else
        window.sessionStorage.removeItem(SIGNUP_IN_PROGRESS_KEY);
}
/** Marks the start of a signup whose Firebase session is not an account yet. */
export function beginSignupSession() {
    markSignupInProgress(true);
}
/**
 * Where Firebase sends the recipient after they click the verification link.
 * `/auth/verified` is a standalone confirmation page rather than the signup page:
 * the link routinely opens in a different browser (the mail app's), where the
 * half-finished signup does not exist. The tab that *is* mid-signup notices the
 * flag flip on its own — see `refreshEmailVerified`.
 */
function emailVerificationSettings() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return origin ? { url: `${origin}/auth/verified`, handleCodeInApp: false } : undefined;
}
/**
 * Creates the Firebase user for a signup and sends the verification mail.
 *
 * Resuming matters more than it looks. Signup creates the Firebase account before
 * either factor is confirmed, so anyone who closes the tab at the verification
 * step leaves a real Firebase user behind with no app account attached. Treating
 * `auth/email-already-in-use` as a hard failure — as this did — made that state
 * permanent: the address was taken by an account that did not exist anywhere the
 * customer could see, and every retry hit the same wall. Signing in with the same
 * credentials instead picks that account back up and carries on from where they
 * stopped.
 *
 * A wrong password on an existing address still fails, and still fails as
 * `auth/email-already-in-use`, because that is the honest answer there: the
 * address belongs to somebody, and this caller cannot prove it is them.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user: import("firebase/auth").User, resumed: boolean }>}
 */
export async function startEmailSignup(email, password) {
    markSignupInProgress(true);
    try {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await sendEmailVerification(credential.user, emailVerificationSettings());
        return { user: credential.user, resumed: false };
    }
    catch (error) {
        if (error?.code !== "auth/email-already-in-use")
            throw error;
        let credential;
        try {
            credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        }
        catch {
            throw error;
        }
        if (credential.user.emailVerified) {
            // Verified and already claimed: this is a completed account, not an
            // abandoned signup. Sign back out so a stale session cannot leak into
            // the signup screen, and let the caller send them to sign in.
            await signOut(firebaseAuth).catch(() => undefined);
            throw error;
        }
        await sendEmailVerification(credential.user, emailVerificationSettings());
        return { user: credential.user, resumed: true };
    }
}
/** Re-sends the verification mail to the signed-in user mid-signup. */
export async function resendSignupVerificationEmail() {
    const user = firebaseAuth.currentUser;
    if (!user)
        throw new Error("Start signup again to resend the verification email.");
    await sendEmailVerification(user, emailVerificationSettings());
}
/**
 * Asks Firebase whether the mailbox link has been opened yet.
 *
 * `reload()` is the load-bearing call: `user.emailVerified` is a snapshot taken
 * when the session was minted, and the click happens in a different tab (often a
 * different browser), so the in-memory copy never changes on its own. This is
 * what lets the signup screen light up by itself instead of asking the customer
 * to come back and press something.
 *
 * @returns {Promise<boolean>}
 */
export async function refreshEmailVerified() {
    const user = firebaseAuth.currentUser;
    if (!user)
        return false;
    await user.reload();
    if (!user.emailVerified)
        return false;
    // Forces the next ID token to carry `email_verified: true`, which is the claim
    // the registration endpoint actually checks.
    await user.getIdToken(true);
    return true;
}
/** Abandons a half-finished signup so the next attempt starts from a clean session. */
export async function cancelPendingSignup() {
    markSignupInProgress(false);
    await signOut(firebaseAuth).catch(() => undefined);
}
export async function signInWithEmail(email, password) {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return credential.user;
}
export async function signInWithAppPassword(email, password) {
    const response = await fetch(toApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 429)
        throw new Error(data.error ?? "TOO_MANY_ATTEMPTS");
    if (!response.ok)
        throw new Error(data.error ?? "Login failed");
    return data.user;
}
export async function signInWithGoogle() {
    const credential = await signInWithPopup(firebaseAuth, googleProvider);
    return credential.user;
}
/**
 * Sends password-reset email via backend (rate-limited + audited). Falls back to client SDK if API fails.
 * @param {string} email
 */
export async function requestPasswordReset(email) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const continueUrl = origin ? `${origin}/auth/reset-password` : undefined;
    const response = await fetch(toApiUrl("/api/auth/request-password-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, continueUrl }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 429) {
        throw new Error(data.message ?? "Too many reset requests. Try again later.");
    }
    if (response.ok)
        return;
    if (response.status === 502) {
        console.warn("Backend reset email failed:", data.error ?? data);
    }
    const originFallback = typeof window !== "undefined" ? window.location.origin : "";
    const resetPath = "/auth/reset-password";
    const actionCodeSettings = originFallback
        ? { url: `${originFallback}${resetPath}`, handleCodeInApp: false }
        : undefined;
    await sendPasswordResetEmail(firebaseAuth, email, actionCodeSettings);
}
/** After Firebase reset email: save password in Postgres only; backend verifies oobCode and invalidates the link. */
export async function completeDbPasswordReset(oobCode, newPassword) {
    const response = await fetch(toApiUrl("/api/auth/complete-db-password-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oobCode, newPassword }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 429)
        throw new Error(data.message ?? "Too many attempts. Try again later.");
    if (!response.ok)
        throw new Error(data.error ?? "Could not save password");
}
export async function signOutUser() {
    await clearServerSessions();
    await signOut(firebaseAuth).catch(() => undefined);
    clearBrowserSessionState();
}
// Several places ask "who is signed in?" during the same page load (provider start-up and the
// Firebase auth callback); share one in-flight request instead of sending three.
let currentUserRequest = null;
export function fetchCurrentAppUser() {
    if (!currentUserRequest) {
        currentUserRequest = loadCurrentAppUser().finally(() => {
            currentUserRequest = null;
        });
    }
    return currentUserRequest;
}
async function loadCurrentAppUser() {
    try {
        const response = await fetch(toApiUrl("/api/auth/me"), { credentials: "include" });
        if (handleUnauthorizedStatus(response.status))
            return null;
        if (!response.ok)
            return null;
        const data = (await response.json());
        return data.user ?? null;
    }
    catch {
        return null;
    }
}
export function onUserChange(callback) {
    return onAuthStateChanged(firebaseAuth, callback);
}
export async function getFirebaseIdToken() {
    const user = firebaseAuth.currentUser;
    if (!user)
        return null;
    // Cached token; the SDK refreshes it by itself shortly before it expires. Forcing a refresh
    // (`getIdToken(true)`) here made every single API call wait on an extra round trip to
    // Google first, and counted against Firebase's token-refresh quota.
    return user.getIdToken();
}
/**
 * Exchanges the current Firebase ID token for an app session, registering the
 * account on first call.
 *
 * @param {{ password?: string }} [options] `password` is only read on the
 *   registration path, where it becomes the account's app login password. Without
 *   it a brand-new account lands with no password hash and rejects its own
 *   credentials at sign-in.
 */
export async function syncSessionWithBackend(options = {}) {
    const token = await getFirebaseIdToken();
    if (!token)
        return null;
    const pendingRole = typeof window !== "undefined"
        ? window.sessionStorage.getItem(PENDING_SIGNUP_ROLE_KEY)
        : null;
    const pendingPhone = typeof window !== "undefined"
        ? window.sessionStorage.getItem(PENDING_VERIFIED_PHONE_KEY)
        : null;
    const pendingSignupPhone = typeof window !== "undefined"
        ? window.sessionStorage.getItem(PENDING_SIGNUP_PHONE_KEY)
        : null;
    const pendingSignupName = typeof window !== "undefined"
        ? window.sessionStorage.getItem(PENDING_SIGNUP_NAME_KEY)
        : null;
    const pendingSignupGender = typeof window !== "undefined"
        ? window.sessionStorage.getItem(PENDING_SIGNUP_GENDER_KEY)
        : null;
    const pendingSignupReferral = typeof window !== "undefined"
        ? window.sessionStorage.getItem(PENDING_SIGNUP_REFERRAL_KEY)
        : null;
    const phoneForSync = pendingPhone ?? pendingSignupPhone;
    const pendingPhoneProof = readPhoneProof();
    const deviceId = getDeviceId();
    const response = await fetch(toApiUrl("/api/auth/session"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(deviceId ? { "x-device-id": deviceId } : {}),
            ...(pendingRole ? { "x-signup-role": pendingRole } : {}),
            ...(phoneForSync ? { "x-user-phone": phoneForSync } : {}),
            ...(pendingSignupName ? { "x-user-name": pendingSignupName } : {}),
            ...(pendingSignupGender ? { "x-user-gender": pendingSignupGender } : {}),
            ...(pendingSignupReferral ? { "x-referral-code": pendingSignupReferral } : {}),
        },
        // Also in the body: the header path is the older one, and registration now
        // rejects a signup with no gender rather than defaulting it.
        body: JSON.stringify({
            ...(pendingSignupGender ? { gender: pendingSignupGender } : {}),
            ...(options.password ? { password: options.password } : {}),
            // Single-use WhatsApp phone proof; only read by the server on registration.
            ...(pendingPhoneProof ? { phoneProof: pendingPhoneProof } : {}),
        }),
    });
    if (response.status === 429) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message ?? "Too many registration attempts. Try again later.");
    }
    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error ?? "Could not sync session with server");
    }
    const data = (await response.json());
    if (pendingRole && typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_SIGNUP_ROLE_KEY);
    }
    if (pendingPhone && typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_VERIFIED_PHONE_KEY);
    }
    if (pendingSignupPhone && typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_SIGNUP_PHONE_KEY);
    }
    if (pendingSignupName && typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_SIGNUP_NAME_KEY);
    }
    if (pendingSignupGender && typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_SIGNUP_GENDER_KEY);
    }
    if (pendingSignupReferral && typeof window !== "undefined") {
        window.sessionStorage.removeItem(PENDING_SIGNUP_REFERRAL_KEY);
    }
    return data.user;
}
export function setPendingSignupRole(role) {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.setItem(PENDING_SIGNUP_ROLE_KEY, role);
}
export function setPendingSignupPhone(phone) {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.setItem(PENDING_SIGNUP_PHONE_KEY, phone);
}
export function setPendingSignupName(name) {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.setItem(PENDING_SIGNUP_NAME_KEY, `${name ?? ""}`.trim());
}
export function setPendingSignupGender(gender) {
    if (typeof window === "undefined")
        return;
    const normalized = `${gender ?? ""}`.trim().toUpperCase();
    // No fallback value: an unset gender must stay unset so registration can ask
    // for it, rather than being stored as a guess.
    if (!["MALE", "FEMALE", "OTHER"].includes(normalized))
        return;
    window.sessionStorage.setItem(PENDING_SIGNUP_GENDER_KEY, normalized);
}
export function setPendingSignupReferralCode(code) {
    if (typeof window === "undefined")
        return;
    const normalized = `${code ?? ""}`.trim().toUpperCase();
    if (!normalized) return;
    window.sessionStorage.setItem(PENDING_SIGNUP_REFERRAL_KEY, normalized);
}
// ---------------------------------------------------------------------------
// Phone verification by WhatsApp OTP (the backend sends the code from the salon's
// WhatsApp Business number). Replaces Firebase SMS: no reCAPTCHA, no Firebase phone
// credential. Login gets an HTTP-only app cookie; signup gets a single-use proof that
// registration (`/api/auth/session`) spends.

/** Server codes the pages branch on; everything else surfaces the server's own message. */
const PASSTHROUGH_OTP_CODES = new Set(["ACCOUNT_NOT_FOUND", "PHONE_ALREADY_REGISTERED", "PHONE_NOT_VERIFIED"]);
let pendingLoginPhone = null;
let pendingSignupOtpPhone = null;
function otpError(data, fallback) {
    const code = typeof data?.error === "string" ? data.error : "";
    const error = new Error(PASSTHROUGH_OTP_CODES.has(code) ? code : data?.message ?? (code || fallback));
    error.code = code ? `whatsapp/${code}` : "whatsapp/error";
    if (data?.retryAfterSeconds)
        error.retryAfterSeconds = data.retryAfterSeconds;
    if (data?.attemptsRemaining !== undefined)
        error.attemptsRemaining = data.attemptsRemaining;
    return error;
}
async function postOtp(path, body) {
    const response = await fetch(toApiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
        throw otpError(data, "Verification failed");
    return data;
}
function readPhoneProof(phone) {
    if (typeof window === "undefined")
        return null;
    const storedPhone = window.sessionStorage.getItem(PENDING_PHONE_PROOF_PHONE_KEY);
    const proof = window.sessionStorage.getItem(PENDING_PHONE_PROOF_KEY);
    if (!proof || (phone && storedPhone !== phone))
        return null;
    return proof;
}
function clearPhoneProof() {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.removeItem(PENDING_PHONE_PROOF_KEY);
    window.sessionStorage.removeItem(PENDING_PHONE_PROOF_PHONE_KEY);
}
/** Login "Phone OTP" tab: sends the code on WhatsApp (only to a number with an account). */
export async function sendPhoneOtp(phone) {
    const data = await postOtp("/api/auth/whatsapp-otp/request", { phone, purpose: "LOGIN" });
    pendingLoginPhone = data.phone ?? phone;
    return data;
}
/** Confirms the login code; the server sets the app session cookie. */
export async function verifyPhoneOtp(code) {
    if (!pendingLoginPhone) {
        throw new Error("OTP not requested yet");
    }
    const data = await postOtp("/api/auth/whatsapp-otp/verify", { phone: pendingLoginPhone, purpose: "LOGIN", code });
    pendingLoginPhone = null;
    // A stale Firebase session (e.g. an earlier Google sign-in) must not shadow the cookie.
    await signOut(firebaseAuth).catch(() => undefined);
    return { firebaseUser: null, appUser: data.user ?? null };
}
/** Staff onboarding: code on WhatsApp to the number on the staff record. */
export async function sendStaffWhatsAppOtp(phone) {
    return postOtp("/api/auth/staff/whatsapp-otp/request", { phone });
}
/** Staff onboarding: exchanges the code for the short-lived password-setup token. */
export async function verifyStaffWhatsAppOtp(phone, code) {
    const data = await postOtp("/api/auth/staff/whatsapp-otp/verify", { phone, code });
    if (!data.setupToken)
        throw new Error("Invalid server response");
    return data.setupToken;
}
/**
 * Signup phone verification on WhatsApp.
 *
 * Returns `"already-verified"` when this tab already holds a proof for this number
 * (a reload, or a second pass while waiting on the email), so the customer is not
 * sent a second code for a step they finished.
 *
 * @param {string} phone E.164
 * @returns {Promise<"sent" | "already-verified">}
 */
export async function sendSignupPhoneOtp(phone) {
    if (readPhoneProof(phone))
        return "already-verified";
    const data = await postOtp("/api/auth/whatsapp-otp/request", { phone, purpose: "SIGNUP" });
    pendingSignupOtpPhone = data.phone ?? phone;
    return "sent";
}
/**
 * Confirms the signup code and keeps the server's proof for registration, without
 * registering yet: registration also needs the confirmed email, and the two factors
 * finish in whichever order the customer completes them.
 *
 * @param {string} code
 * @returns {Promise<string>} the E.164 number that was verified
 */
export async function verifySignupPhoneOtp(code) {
    if (!pendingSignupOtpPhone) {
        throw new Error("OTP not requested yet");
    }
    const data = await postOtp("/api/auth/whatsapp-otp/verify", { phone: pendingSignupOtpPhone, purpose: "SIGNUP", code });
    pendingSignupOtpPhone = null;
    if (!data.phoneProof || !data.phone) {
        throw new Error("Invalid server response");
    }
    if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PENDING_PHONE_PROOF_KEY, data.phoneProof);
        window.sessionStorage.setItem(PENDING_PHONE_PROOF_PHONE_KEY, data.phone);
        window.sessionStorage.setItem(PENDING_VERIFIED_PHONE_KEY, data.phone);
    }
    return data.phone;
}
/**
 * Creates the app account, once and only once both factors are confirmed.
 *
 * The server re-checks both — the email from the Firebase ID token's own claims, the
 * phone from the WhatsApp proof — and refuses the registration otherwise, so this is
 * the convenient path rather than the enforcement.
 *
 * @param {string} [signupPassword] persisted as the app login password
 * @returns {Promise<object>} the created app user
 */
export async function completeVerifiedSignup(signupPassword) {
    const user = firebaseAuth.currentUser;
    if (!user)
        throw new Error("Your signup session expired. Please start again.");
    await user.reload();
    const proofPhone = typeof window !== "undefined" ? window.sessionStorage.getItem(PENDING_PHONE_PROOF_PHONE_KEY) : null;
    if (!readPhoneProof() && !user.phoneNumber)
        throw new Error("PHONE_NOT_VERIFIED");
    if (!user.emailVerified)
        throw new Error("EMAIL_NOT_VERIFIED");
    if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PENDING_VERIFIED_PHONE_KEY, proofPhone ?? user.phoneNumber);
    }
    let appUser;
    try {
        appUser = await syncSessionWithBackend({ password: signupPassword });
    }
    catch (error) {
        // An expired or already-spent proof cannot be retried: make the page ask again.
        if (error instanceof Error && error.message === "PHONE_NOT_VERIFIED")
            clearPhoneProof();
        throw error;
    }
    clearPhoneProof();
    // Only after the row exists: clearing earlier would let `AuthProvider` race
    // this call with a sync of its own against an account still being created.
    markSignupInProgress(false);
    return appUser;
}
/**
 * Whether an app account already uses this address.
 * Checked on the details step so a duplicate is caught while the customer is still
 * looking at the field, rather than after a Firebase user has been created for it.
 *
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function emailExists(email) {
    const trimmed = `${email ?? ""}`.trim();
    if (!trimmed.includes("@"))
        return false;
    const response = await fetch(toApiUrl(`/api/auth/email-exists?email=${encodeURIComponent(trimmed)}`));
    if (!response.ok)
        return false;
    const data = (await response.json());
    return data.exists === true;
}
export async function phoneExists(phone) {
    const response = await fetch(toApiUrl(`/api/auth/phone-exists?phone=${encodeURIComponent(phone)}`));
    if (!response.ok)
        return false;
    const data = (await response.json());
    return data.exists;
}
