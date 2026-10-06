/**
 * Referral link helpers. The link format is the one the signup page already reads
 * (`/auth/signup?ref=CODE`, see auth/pages/SignupPage.jsx); the code comes from
 * GET /api/customer/loyalty → `referralCode`.
 */
export function buildReferralLink(code, origin = typeof window !== "undefined" ? window.location.origin : "") {
  const clean = `${code ?? ""}`.trim();
  return clean ? `${origin}/auth/signup?ref=${encodeURIComponent(clean)}` : "";
}

export const DEFAULT_SHARE_TEXT = "Book your next salon visit with my referral link and we both earn rewards!";

export function whatsappShareHref(link, text = DEFAULT_SHARE_TEXT) {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`;
}

/** Native share sheet when available. Resolves "shared" | "cancelled" | "unsupported". */
export async function shareLink({ title = "Join me at Sahasra Salon", text = DEFAULT_SHARE_TEXT, url }) {
  if (typeof navigator === "undefined" || !navigator.share) return "unsupported";
  try {
    await navigator.share({ title, text, url });
    return "shared";
  } catch {
    return "cancelled";
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
