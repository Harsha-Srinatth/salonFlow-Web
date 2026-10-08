import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import { withFreshRecaptcha } from "@/lib/firebase/recaptcha";
import { toApiUrl } from "@/lib/api-base";
import { clearBrowserSessionState, clearServerSessions, handleUnauthorizedStatus } from "@/lib/auth/session-manager";
import { getDeviceId } from "@/lib/device-id";
import { SIGNUP_IN_PROGRESS_KEY } from "@/lib/auth/app-user";
export { fetchCurrentAppUser, isSignupInProgress } from "@/lib/auth/app-user";
import { createUserWithEmailAndPassword, linkWithPhoneNumber, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPhoneNumber, signInWithPopup, signOut, } from "firebase/auth";
const PENDING_SIGNUP_ROLE_KEY = "pending_signup_role";
const PENDING_SIGNUP_PHONE_KEY = "pending_signup_phone";
const PENDING_SIGNUP_NAME_KEY = "pending_signup_name";
const PENDING_SIGNUP_GENDER_KEY = "pending_signup_gender";
const PENDING_SIGNUP_REFERRAL_KEY = "pending_signup_referral";
const PENDING_VERIFIED_PHONE_KEY = "pending_verified_phone";
let phoneConfirmationResult = null;
let staffPhoneConfirmationResult = null;
let signupPhoneConfirmationResult = null;
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
// The sign-in screen and AuthProvider's Firebase listener both sync right after a sign-in; share
// one request between them (registration, which passes a password, always runs on its own).
let sessionSyncRequest = null;
export function syncSessionWithBackend(options = {}) {
    if (options.password !== undefined)
        return runSessionSync(options);
    if (!sessionSyncRequest) {
        sessionSyncRequest = runSessionSync(options).finally(() => {
            sessionSyncRequest = null;
        });
    }
    return sessionSyncRequest;
}
async function runSessionSync(options = {}) {
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
export async function sendPhoneOtp(phone) {
    phoneConfirmationResult = await withFreshRecaptcha(verifier => signInWithPhoneNumber(firebaseAuth, phone, verifier));
}
/** Firebase SMS for staff onboarding. */
export async function sendStaffFirebasePhoneOtp(phone) {
    staffPhoneConfirmationResult = await withFreshRecaptcha(verifier => signInWithPhoneNumber(firebaseAuth, phone, verifier));
}
export async function confirmStaffFirebasePhoneOtp(code) {
    if (!staffPhoneConfirmationResult) {
        throw new Error("SMS code not requested yet");
    }
    const credential = await staffPhoneConfirmationResult.confirm(code);
    const idToken = await credential.user.getIdToken(true);
    staffPhoneConfirmationResult = null;
    await signOut(firebaseAuth);
    return idToken;
}
export async function verifyPhoneOtp(code) {
    if (!phoneConfirmationResult) {
        throw new Error("OTP not requested yet");
    }
    const credential = await phoneConfirmationResult.confirm(code);
    const normalizedPhone = credential.user.phoneNumber;
    if (!normalizedPhone) {
        throw new Error("Phone number is missing from verified user");
    }
    if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PENDING_VERIFIED_PHONE_KEY, normalizedPhone);
    }
    const syncedUser = await syncSessionWithBackend();
    return { firebaseUser: credential.user, appUser: syncedUser };
}
/**
 * Signup phone verification: links the phone number to the *already signed-in* Firebase user
 * (created via email/password or Google) instead of creating a second, separate credential.
 * Keeps signup on the same real-SMS-verification standard as the login "Phone OTP" tab.
 *
 * Returns `"already-verified"` when this user has the number attached already, which
 * happens whenever someone re-enters the verification step after confirming the SMS —
 * a reload, or a second pass while waiting on the email. Firebase answers that with
 * `auth/provider-already-linked`, and treating it as an error stranded people at a
 * step they had in fact finished.
 *
 * @param {string} phone E.164
 * @returns {Promise<"sent" | "already-verified">}
 */
export async function sendSignupPhoneOtp(phone) {
    const user = firebaseAuth.currentUser;
    if (!user) {
        throw new Error("Create your account first, then verify your phone.");
    }
    if (user.phoneNumber === phone)
        return "already-verified";
    try {
        signupPhoneConfirmationResult = await withFreshRecaptcha(verifier => linkWithPhoneNumber(user, phone, verifier));
        return "sent";
    }
    catch (error) {
        if (error?.code === "auth/provider-already-linked")
            return "already-verified";
        throw error;
    }
}
/**
 * Confirms the signup SMS code and links the number, without registering yet.
 * Registration is deliberately a separate step (`completeVerifiedSignup`) because
 * it may only run once the email is confirmed too, and the two factors finish in
 * whichever order the customer happens to complete them.
 *
 * @param {string} code
 * @returns {Promise<string>} the E.164 number Firebase confirmed
 */
export async function verifySignupPhoneOtp(code) {
    if (!signupPhoneConfirmationResult) {
        throw new Error("OTP not requested yet");
    }
    const result = await signupPhoneConfirmationResult.confirm(code);
    signupPhoneConfirmationResult = null;
    const normalizedPhone = result.user.phoneNumber;
    if (!normalizedPhone) {
        throw new Error("Phone number is missing from verified user");
    }
    if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PENDING_VERIFIED_PHONE_KEY, normalizedPhone);
    }
    return normalizedPhone;
}
/**
 * Creates the app account, once and only once both factors are confirmed.
 *
 * The server re-checks both from the ID token's own claims and refuses the
 * registration otherwise, so this is the convenient path rather than the
 * enforcement — the guarantee lives in `describeRegistrationVerificationFailure`
 * on the backend.
 *
 * @param {string} [signupPassword] persisted as the app login password
 * @returns {Promise<object>} the created app user
 */
export async function completeVerifiedSignup(signupPassword) {
    const user = firebaseAuth.currentUser;
    if (!user)
        throw new Error("Your signup session expired. Please start again.");
    await user.reload();
    if (!user.phoneNumber)
        throw new Error("PHONE_NOT_VERIFIED");
    if (!user.emailVerified)
        throw new Error("EMAIL_NOT_VERIFIED");
    if (typeof window !== "undefined") {
        window.sessionStorage.setItem(PENDING_VERIFIED_PHONE_KEY, user.phoneNumber);
    }
    const appUser = await syncSessionWithBackend({ password: signupPassword });
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
