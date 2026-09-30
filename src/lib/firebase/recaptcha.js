/**
 * reCAPTCHA lifecycle for every Firebase SMS send in the app.
 *
 * This exists because of two properties of invisible reCAPTCHA that a cached
 * verifier violates, and which together were the main reason phone verification
 * "just failed":
 *
 *  1. **A verifier is single-use.** The token it produces is consumed by the
 *     `signInWithPhoneNumber` / `linkWithPhoneNumber` call it was passed to.
 *     Handing the same instance to a second call — which is exactly what
 *     "Resend code" and "retry after a wrong code" do — sends an already-spent
 *     token, and Firebase answers with `auth/captcha-check-failed`, or the
 *     promise simply never settles and the button spins forever.
 *
 *  2. **A verifier is bound to the DOM node it rendered into.** The old code
 *     cached one instance on the auth singleton, so the instance outlived the
 *     React page that owned its `<div id="recaptcha-container">`. After a route
 *     change — login → signup being the common path — the node it points at is
 *     detached, and the widget can never resolve.
 *
 * The fix for both is to stop caching. Every send builds a fresh verifier, and
 * the host element belongs to this module and lives on `document.body`, so it is
 * outside React's tree entirely and no unmount can pull it out from under an
 * in-flight challenge.
 */
import { RecaptchaVerifier } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

const CONTAINER_ID = "sahasra-recaptcha-host";

let activeVerifier = null;

/**
 * Returns this module's host element, creating it on first use.
 * Zero-sized and fixed rather than `display: none` — reCAPTCHA refuses to run in
 * a container it considers hidden, but it does not mind one that is merely empty.
 *
 * @returns {HTMLElement}
 */
function getRecaptchaHost() {
  let host = document.getElementById(CONTAINER_ID);
  if (host) return host;
  host = document.createElement("div");
  host.id = CONTAINER_ID;
  host.style.position = "fixed";
  host.style.bottom = "0";
  host.style.right = "0";
  host.style.width = "1px";
  host.style.height = "1px";
  host.style.overflow = "hidden";
  host.style.opacity = "0";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);
  return host;
}

/**
 * Tears down the current verifier and empties the host.
 * Safe to call at any time, including when nothing is active — pages call it on
 * unmount so an abandoned challenge does not leak into the next attempt.
 */
export function destroyRecaptcha() {
  if (activeVerifier) {
    try {
      activeVerifier.clear();
    } catch {
      // `clear()` throws if the widget was already torn down by a reload or a
      // Firebase-internal reset. Nothing to recover — the goal is just to reach
      // a state where a new verifier can render.
    }
    activeVerifier = null;
  }
  const host = document.getElementById(CONTAINER_ID);
  if (host) host.innerHTML = "";
}

/**
 * Runs one SMS send against a verifier built for that send alone.
 *
 * `render()` is awaited rather than left implicit so a misconfigured project
 * (domain missing from Firebase's Authorized domains, phone sign-in provider
 * disabled) fails here with its real error code, instead of surfacing later as
 * an unexplained timeout on the send itself.
 *
 * @template T
 * @param {(verifier: import("firebase/auth").RecaptchaVerifier) => Promise<T>} send
 * @returns {Promise<T>}
 */
export async function withFreshRecaptcha(send) {
  destroyRecaptcha();
  const verifier = new RecaptchaVerifier(firebaseAuth, getRecaptchaHost(), { size: "invisible" });
  activeVerifier = verifier;
  try {
    await verifier.render();
    return await send(verifier);
  } catch (error) {
    // A failed send leaves the widget in a state the next attempt cannot reuse,
    // so retrying without this reset reproduces the original bug one level down.
    destroyRecaptcha();
    throw error;
  }
}
