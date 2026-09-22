// App-layer AES-256-GCM field encryption for sensitive PII (Address phone/lines,
// Order shipping_address snapshot, CustomerProfile.notes, Vendor bank details).
// The key lives in the Base44 secrets vault as PII_ENCRYPTION_KEY (32 bytes,
// base64). Ciphertext is prefixed with the key version (v1) so a future key
// rotation can fall back to old versions. This module is SERVER-SIDE ONLY —
// imported exclusively by backend functions. Never import it from client code;
// the encryption key must never reach the browser.
import { secrets } from "base44:runtime";

const b64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const b64d = (str: string): Uint8Array => {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const CURRENT_VERSION = "v1";
let _warned = false;

function rawKey(): string | null {
  try { return secrets.get("PII_ENCRYPTION_KEY") || null; } catch { return null; }
}

async function aesKey(): Promise<CryptoKey | null> {
  const raw = rawKey();
  if (!raw) return null;
  return crypto.subtle.importKey("raw", b64d(raw) as BufferSource, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

// True once PII_ENCRYPTION_KEY is set in the vault. UIs/admins can surface this
// so it's obvious whether encryption is actually active vs. plaintext fallback.
export function piiEncryptionEnabled(): boolean {
  return !!rawKey();
}

// Encrypt a single field. Returns "v1:<iv>:<ciphertext>" or, if the key is not
// set, the original plaintext (so the app keeps working until the key is added).
export async function encryptPII(plaintext: string | null | undefined): Promise<string | null | undefined> {
  if (plaintext == null || plaintext === "") return plaintext;
  const key = await aesKey();
  if (!key) {
    if (!_warned) { console.warn("[piiCrypto] PII_ENCRYPTION_KEY not set — storing plaintext. Set the secret to activate field encryption."); _warned = true; }
    return plaintext;
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(String(plaintext));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data as BufferSource));
  return `${CURRENT_VERSION}:${b64(iv)}:${b64(ct)}`;
}

// Decrypt a single field. Passes through legacy plaintext (no v1 prefix) so old
// records keep displaying; returns "" if a v1 value can't be decrypted (missing
// key or corruption) rather than leaking ciphertext structure to the UI.
export async function decryptPII(value: string | null | undefined): Promise<string | null | undefined> {
  if (value == null || value === "" || typeof value !== "string") return value;
  if (!value.startsWith("v1:")) return value;
  const key = await aesKey();
  if (!key) return "";
  try {
    const parts = value.split(":");
    const iv = b64d(parts[1]);
    const ct = b64d(parts.slice(2).join(":"));
    const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ct as BufferSource));
    return new TextDecoder().decode(pt);
  } catch {
    return "";
  }
}

// Encrypt/decrypt the sensitive subfields of an address-like object
// (used for Address records and Order shipping/billing snapshots). Only phone,
// line1 and line2 are encrypted — name/city/state/postal_code/country stay
// plaintext so they remain searchable and displayable without decryption.
export async function encryptAddress(addr: any): Promise<any> {
  if (!addr || typeof addr !== "object") return addr;
  return { ...addr, phone: await encryptPII(addr.phone), line1: await encryptPII(addr.line1), line2: await encryptPII(addr.line2) };
}

export async function decryptAddress(addr: any): Promise<any> {
  if (!addr || typeof addr !== "object") return addr;
  return { ...addr, phone: await decryptPII(addr.phone), line1: await decryptPII(addr.line1), line2: await decryptPII(addr.line2) };
}

// Mask a bank/IBAN string to its last 4 characters for UI display.
export function maskBank(value: string | null | undefined): string {
  if (!value) return "";
  const clean = String(value).replace(/\s+/g, "");
  if (clean.length <= 4) return "••••";
  return "•••• " + clean.slice(-4);
}