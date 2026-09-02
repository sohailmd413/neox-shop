import { base44 } from "@/api/base44Client";

// Build a CODE128-compatible candidate barcode value derived from a timestamp + random token.
// CODE128 accepts arbitrary ASCII, so the format "MF-{time36}-{rand36}" is always scannable.
function candidateCode() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MF-${t}-${r}`;
}

// Generate a unique barcode by checking the Product store for collisions before returning.
// Only CODE128 is auto-generated; EAN13 must be entered manually (it has a fixed checksum).
export async function generateUniqueBarcode(type = "CODE128") {
  if (type && type !== "CODE128") return "";
  for (let i = 0; i < 12; i++) {
    const code = candidateCode();
    try {
      const existing = await base44.entities.Product.filter({ barcode: code });
      if (!existing || existing.length === 0) return code;
    } catch {
      // If the uniqueness check itself fails, fall back to the candidate (best-effort).
      return code;
    }
  }
  // Extremely unlikely fallback after 12 collisions.
  return candidateCode();
}

// Compute the EAN13 checksum digit for a 12-digit numeric string.
export function ean13Checksum(twelve) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(twelve[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}