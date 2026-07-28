import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import { toApiUrl } from "@/lib/api-base";
import { clearBrowserSessionState, clearServerSessions, handleUnauthorizedStatus } from "@/lib/auth/session-manager";
import { createUserWithEmailAndPassword, onAuthStateChanged, RecaptchaVerifier, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPhoneNumber, signInWithPopup, signOut, } from "firebase/auth";
const PENDING_SIGNUP_ROLE_KEY = "pending_signup_role";
const PENDING_SIGNUP_PHONE_KEY = "pending_signup_phone";
const PENDING_SIGNUP_NAME_KEY = "pending_signup_name";
const PENDING_SIGNUP_GENDER_KEY = "pending_signup_gender";
const PENDING_VERIFIED_PHONE_KEY = "pending_verified_phone";
const RECAPTCHA_CONTAINER_ID = "recaptcha-container";
const STAFF_RECAPTCHA_CONTAINER_ID = "staff-recaptcha-container";
let phoneConfirmationResult = null;
let staffPhoneConfirmationResult = null;
export async function signUpWithEmail(email, password) {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    // Use actionCodeSettings so the link always points to the current domain
    // (localhost in dev, salonflow-eta.vercel.app in production)
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const emailVerificationSettings = origin
        ? { url: `${origin}/auth/login`, handleCodeInApp: false }
        : undefined;
    await sendEmailVerification(credential.user, emailVerificationSettings);
    return credential.user;
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
export async function fetchCurrentAppUser() {
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
    return user.getIdToken(true);
}
export async function syncSessionWithBackend() {
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
    const phoneForSync = pendingPhone ?? pendingSignupPhone;
    const response = await fetch(toApiUrl("/api/auth/session"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(pendingRole ? { "x-signup-role": pendingRole } : {}),
            ...(phoneForSync ? { "x-user-phone": phoneForSync } : {}),
            ...(pendingSignupName ? { "x-user-name": pendingSignupName } : {}),
            ...(pendingSignupGender ? { "x-user-gender": pendingSignupGender } : {}),
        },
    });
    if (response.status === 429) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.message ?? "Too many registration attempts. Try again later.");
    }
    if (!response.ok)
        return null;
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
    window.sessionStorage.setItem(PENDING_SIGNUP_GENDER_KEY, `${gender ?? "OTHER"}`.trim().toUpperCase());
}
function getOrCreateRecaptchaVerifier() {
    const authWithCaptcha = firebaseAuth;
    if (authWithCaptcha._otpRecaptchaVerifier)
        return authWithCaptcha._otpRecaptchaVerifier;
    const recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, RECAPTCHA_CONTAINER_ID, {
        size: "invisible",
    });
    authWithCaptcha._otpRecaptchaVerifier = recaptchaVerifier;
    return recaptchaVerifier;
}
export async function sendPhoneOtp(phone) {
    const verifier = getOrCreateRecaptchaVerifier();
    phoneConfirmationResult = await signInWithPhoneNumber(firebaseAuth, phone, verifier);
}
function getOrCreateStaffRecaptchaVerifier() {
    const authWithCaptcha = firebaseAuth;
    if (authWithCaptcha._staffRecaptchaVerifier)
        return authWithCaptcha._staffRecaptchaVerifier;
    const recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, STAFF_RECAPTCHA_CONTAINER_ID, {
        size: "invisible",
    });
    authWithCaptcha._staffRecaptchaVerifier = recaptchaVerifier;
    return recaptchaVerifier;
}
/** Firebase SMS for staff onboarding (separate reCAPTCHA from customer login). */
export async function sendStaffFirebasePhoneOtp(phone) {
    const verifier = getOrCreateStaffRecaptchaVerifier();
    staffPhoneConfirmationResult = await signInWithPhoneNumber(firebaseAuth, phone, verifier);
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
export async function phoneExists(phone) {
    const response = await fetch(toApiUrl(`/api/auth/phone-exists?phone=${encodeURIComponent(phone)}`));
    if (!response.ok)
        return false;
    const data = (await response.json());
    return data.exists;
}
