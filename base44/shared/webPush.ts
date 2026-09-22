// Web Push send over RFC 8291 (aes128gcm payload encryption) + RFC 8292 (VAPID
// JWT), implemented with the Web Crypto SubtleCrypto API. The Base44 function
// runtime is a V8 isolate, so Node `crypto`-backed libs like `web-push` aren't
// reliable here — this uses only web-standard crypto.
import { secrets } from "base44:runtime";

// Public VAPID key (not secret) + the VAPID subject claim. The matching private
// key is the VAPID_PRIVATE_KEY secret.
export const VAPID_PUBLIC_KEY =
  "BNynAO_b7uJzFes9frd_W9lUtJPocFuR-78Wy1dPmMSyAbGXaaSgwe7OCXTqSAO72Da1T63UF_wpQz3izaQx4zw";
export const VAPID_SUBJECT = "https://neox-shop.base44.app";

const b64urlEncode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const b64urlDecode = (str: string): Uint8Array => {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const strToBytes = (s: string) => new TextEncoder().encode(s);

async function hmac(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, data as BufferSource);
  return new Uint8Array(sig);
}

// HKDF-Extract(salt, ikm) = HMAC(salt, ikm)
async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array) {
  return hmac(salt, ikm);
}

// HKDF-Expand(prk, info, length) — length <= 32 (single block)
async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number) {
  const t = await hmac(prk, new Uint8Array([...info, 1]));
  return t.slice(0, length);
}

async function importEcdsaPrivate(pkcs8B64url: string) {
  const der = b64urlDecode(pkcs8B64url);
  return crypto.subtle.importKey("pkcs8", der as BufferSource, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
}

// RFC 8291 aes128gcm content encryption. Returns the full body: header + ciphertext.
async function encryptPayload(p256dhB64url: string, authB64url: string, payloadStr: string): Promise<Uint8Array> {
  // 1. recipient public key (ECDH P-256, raw 65-byte uncompressed point)
  const recipientPub = b64urlDecode(p256dhB64url);
  const recipientKey = await crypto.subtle.importKey("raw", recipientPub as BufferSource, { name: "ECDH", namedCurve: "P-256" }, false, []);

  // 2. ephemeral sender ECDH key pair
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const sharedBits = await crypto.subtle.deriveBits({ name: "ECDH", public: recipientKey }, ephemeral.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedBits); // 32 bytes
  const ephemeralPub = new Uint8Array(await crypto.subtle.exportKey("raw", ephemeral.publicKey)); // 65 bytes

  // 3. PRK = HMAC-SHA-256(auth_secret, ecdh_secret)  (salt = auth, ikm = shared)
  const authSecret = b64urlDecode(authB64url);
  const prk = await hkdfExtract(authSecret, sharedSecret);

  // 4. content encryption key (16) + nonce (12)
  const cek = await hkdfExpand(prk, new Uint8Array([...strToBytes("Content-Encoding: aes128gcm"), 0]), 16);
  const nonce = await hkdfExpand(prk, new Uint8Array([...strToBytes("Content-Encoding: nonce"), 0]), 12);

  // 5. padded plaintext = message || 0x02 (RFC 8291 record delimiter, no padding)
  const plaintext = new Uint8Array([...strToBytes(payloadStr), 0x02]);

  // 6. AES-128-GCM (Web Crypto appends the 16-byte tag to the ciphertext)
  const aesKey = await crypto.subtle.importKey("raw", cek as BufferSource, { name: "AES-GCM" }, false, ["encrypt"]);
  const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource, tagLength: 128 }, aesKey, plaintext as BufferSource);
  const ciphertext = new Uint8Array(enc);

  // 7. header: salt(16) || rs(4, 4096=0x00001000) || idlen(1, 65) || keyid(ephemeral pub 65)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const rs = new Uint8Array([0, 0, 0x10, 0]);
  const header = new Uint8Array([...salt, ...rs, 65, ...ephemeralPub]);
  return new Uint8Array([...header, ...ciphertext]);
}

async function makeVapidJwt(endpoint: string, privateKey: CryptoKey): Promise<string> {
  const u = new URL(endpoint);
  const aud = `${u.protocol}//${u.host}`;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud, exp: now + 12 * 3600, sub: VAPID_SUBJECT };
  const h = b64urlEncode(strToBytes(JSON.stringify(header)));
  const p = b64urlEncode(strToBytes(JSON.stringify(payload)));
  const signingInput = strToBytes(`${h}.${p}`);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, signingInput as BufferSource));
  return `${h}.${p}.${b64urlEncode(sig)}`;
}

// Send one web push to a subscription endpoint. Returns { status, ok }.
// 201/202 = delivered; 404/410 = subscription expired (caller should clean up).
export async function sendWebPush(subscription: { endpoint: string; p256dh?: string; auth?: string; keys?: { p256dh: string; auth: string } }, payload: string | object, vapidPrivateKeyB64url: string) {
  const endpoint = subscription.endpoint;
  const p256dh = subscription.keys?.p256dh || subscription.p256dh;
  const auth = subscription.keys?.auth || subscription.auth;
  if (!endpoint || !p256dh || !auth) return { status: 0, ok: false, error: "invalid_subscription" };

  const privKey = await importEcdsaPrivate(vapidPrivateKeyB64url);
  const body = await encryptPayload(p256dh, auth, typeof payload === "string" ? payload : JSON.stringify(payload));
  const jwt = await makeVapidJwt(endpoint, privKey);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      TTL: "2419200",
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      Authorization: `vapid t=${jwt}`,
      "Crypto-Key": `p256ecdsa=${VAPID_PUBLIC_KEY}`,
    },
    body: body as BufferSource,
  });
  return { status: res.status, ok: res.status === 201 || res.status === 202 };
}