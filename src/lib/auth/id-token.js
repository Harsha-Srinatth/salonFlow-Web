/**
 * Firebase ID token for API calls, without putting the Firebase SDK in the entry bundle: the SDK
 * is imported on first use. Waits for Firebase to restore a persisted session first, so a call
 * made right after page load still gets the signed-in user's token instead of null.
 */
export async function getFirebaseIdToken() {
    const [{ firebaseAuth }, client] = await Promise.all([import("@/lib/firebase/client"), import("@/lib/auth/auth-client")]);
    await firebaseAuth.authStateReady();
    return client.getFirebaseIdToken();
}
