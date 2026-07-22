function toBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i]);
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(base64Key) {
  const raw = fromBase64(base64Key);
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export function isPayloadEncryptionEnabled() {
  return Boolean(import.meta.env.VITE_BOOKING_CRYPTO_KEY_BASE64);
}

export async function encryptPayloadEnvelope(payload) {
  const base64Key = import.meta.env.VITE_BOOKING_CRYPTO_KEY_BASE64;
  const activeKid = import.meta.env.VITE_BOOKING_CRYPTO_ACTIVE_KID ?? "v1";
  if (!base64Key) return null;
  const key = await importKey(base64Key);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(payload ?? {}));
  const cipherWithTag = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  const tagLength = 16;
  const data = cipherWithTag.slice(0, cipherWithTag.length - tagLength);
  const tag = cipherWithTag.slice(cipherWithTag.length - tagLength);
  return {
    v: 1,
    alg: "aes-256-gcm",
    kid: activeKid,
    iv: toBase64(iv),
    data: toBase64(data),
    tag: toBase64(tag),
  };
}

export async function decryptPayloadEnvelope(envelope) {
  const base64Key = import.meta.env.VITE_BOOKING_CRYPTO_KEY_BASE64;
  if (!base64Key || !envelope) return null;
  const key = await importKey(base64Key);
  const iv = fromBase64(envelope.iv);
  const data = fromBase64(envelope.data);
  const tag = fromBase64(envelope.tag);
  const combined = new Uint8Array(data.length + tag.length);
  combined.set(data, 0);
  combined.set(tag, data.length);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return JSON.parse(new TextDecoder().decode(plain));
}
