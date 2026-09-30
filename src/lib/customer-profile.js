import { getFirebaseIdToken } from "@/lib/auth/auth-client";
import { toApiUrl } from "@/lib/api-base";

/**
 * Partial update of the signed-in customer's profile.
 *
 * Only the keys you pass are touched, so the reward-vault prompt can send just
 * `{ gender }` without clearing the name. Pass `dateOfBirth: ""` to clear it.
 * Email and phone are verified identity and are not editable here.
 *
 * @param {{ name?: string, gender?: "MALE" | "FEMALE" | "OTHER", dateOfBirth?: string }} updates
 * @returns {Promise<object>} the updated user
 */
export async function updateCustomerProfile(updates) {
  const token = await getFirebaseIdToken().catch(() => null);
  const res = await fetch(toApiUrl("/api/customer/profile"), {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(updates),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not save your profile");
  return data.user;
}

/**
 * Convenience wrapper for the gender-only path (reward vault prompt).
 *
 * @param {"MALE" | "FEMALE" | "OTHER"} gender
 */
export async function saveCustomerGender(gender) {
  const user = await updateCustomerProfile({ gender });
  return user?.gender;
}

/**
 * Age in whole years from a `YYYY-MM-DD` string, for display next to the date
 * of birth. Mirrors the backend's `calculateAge`, and like it compares calendar
 * strings rather than `Date` objects so a timezone can't shift the birthday.
 *
 * @param {string | null | undefined} dateOfBirth
 * @returns {number | null}
 */
export function calculateAge(dateOfBirth) {
  const dob = `${dateOfBirth ?? ""}`.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const now = new Date();
  const today = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;
  let age = Number(today.slice(0, 4)) - Number(dob.slice(0, 4));
  if (today.slice(5) < dob.slice(5)) age -= 1;
  return age >= 0 ? age : null;
}
