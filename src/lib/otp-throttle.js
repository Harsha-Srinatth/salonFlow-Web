/**
 * Client-side throttling for Firebase SMS OTP flows (customer + staff verify pages).
 * Firebase still enforces its own limits; this layer prevents rapid resends and adds a 5-minute
 * lockout after repeated wrong verification attempts (per browser sessionStorage).
 *
 * Durations align with product policy: resend cooldown 5 minutes, lockout 5 minutes after 5 bad tries.
 */

const RESEND_COOLDOWN_MS = Number(import.meta.env.VITE_OTP_RESEND_COOLDOWN_MS ?? 5 * 60 * 1000);
const MAX_VERIFY_FAILURES = Number(import.meta.env.VITE_OTP_MAX_VERIFY_FAILURES ?? 5);
const VERIFY_LOCKOUT_MS = Number(import.meta.env.VITE_OTP_VERIFY_LOCKOUT_MS ?? 5 * 60 * 1000);
function keySend(channel, e164Phone) {
    return `otp_send:${channel}:${e164Phone.trim()}`;
}
function keyFail(channel, e164Phone) {
    return `otp_fail:${channel}:${e164Phone.trim()}`;
}
function keyLock(channel, e164Phone) {
    return `otp_lock:${channel}:${e164Phone.trim()}`;
}
/**
 * Ensures at least `RESEND_COOLDOWN_MS` has passed since the last SMS request for this channel+phone.
 * @param {"customer" | "staff"} channel
 * @param {string} e164Phone
 * @throws {Error} with user-readable wait message
 */
export function assertCanSendOtp(channel, e164Phone) {
    if (typeof window === "undefined")
        return;
    const last = window.sessionStorage.getItem(keySend(channel, e164Phone));
    if (!last)
        return;
    const delta = Date.now() - Number(last);
    if (delta < RESEND_COOLDOWN_MS) {
        const sec = Math.ceil((RESEND_COOLDOWN_MS - delta) / 1000);
        throw new Error(`Please wait ${sec}s before requesting another code.`);
    }
}
/**
 * Records send time for cooldown tracking.
 * @param {"customer" | "staff"} channel
 * @param {string} e164Phone
 */
export function recordOtpSend(channel, e164Phone) {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.setItem(keySend(channel, e164Phone), String(Date.now()));
}
/**
 * Blocks verify attempts while lockout timestamp is in the future.
 * @param {"customer" | "staff"} channel
 * @param {string} e164Phone
 */
export function assertOtpVerifyNotLocked(channel, e164Phone) {
    if (typeof window === "undefined")
        return;
    const until = Number(window.sessionStorage.getItem(keyLock(channel, e164Phone)) ?? "0");
    if (until > Date.now()) {
        const sec = Math.ceil((until - Date.now()) / 1000);
        throw new Error(`Too many incorrect codes. Try again in ${sec}s.`);
    }
}
/**
 * Increments failed verify count; after `MAX_VERIFY_FAILURES`, starts `VERIFY_LOCKOUT_MS` lockout.
 * @param {"customer" | "staff"} channel
 * @param {string} e164Phone
 */
export function recordOtpVerifyFailure(channel, e164Phone) {
    if (typeof window === "undefined")
        return;
    const k = keyFail(channel, e164Phone);
    const n = Number(window.sessionStorage.getItem(k) ?? "0") + 1;
    window.sessionStorage.setItem(k, String(n));
    if (n >= MAX_VERIFY_FAILURES) {
        window.sessionStorage.setItem(keyLock(channel, e164Phone), String(Date.now() + VERIFY_LOCKOUT_MS));
        window.sessionStorage.removeItem(k);
    }
}
/**
 * Clears failure + lockout state after a successful verification.
 * @param {"customer" | "staff"} channel
 * @param {string} e164Phone
 */
export function clearOtpVerifyGuards(channel, e164Phone) {
    if (typeof window === "undefined")
        return;
    window.sessionStorage.removeItem(keyFail(channel, e164Phone));
    window.sessionStorage.removeItem(keyLock(channel, e164Phone));
}
