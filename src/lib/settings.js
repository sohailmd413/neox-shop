import { base44 } from "@/api/base44Client";

// Singleton store-settings record, keyed by "store". Defaults seed the first
// admin save so the admin never starts from an empty form.
//  - getStoreSetting(): read-only, safe for the public storefront (never creates).
//  - ensureStoreSetting(): admin-only; creates the record on first visit.
export const DEFAULT_SETTING = {
  key: "store",
  store_name: "MarketFlow",
  store_name_ar: "ماركت فلو",
  logo_url: "",
  contact_email: "billing@marketflow.com",
  contact_phone: "+966 11 000 0000",
  business_address: "123 Commerce Street, Riyadh, Saudi Arabia",
  business_hours: "Sat–Thu, 9am–9pm",
  tax_id: "300000000000003",
  currency: "SAR",
  currency_symbol: "﷼",
  default_language: "en",
  payment_methods_enabled: ["card", "cod"],
  shipping_zones: [],
  tax_rules: [],
  terms_policy: "",
  privacy_policy: "",
  return_policy: "",
  shipping_policy: "",
  in_grid_insert_every_n_products: 4,
};

const KEY = "store";

// Currency used by the synchronous formatPrice() across the whole app.
// Set once the Setting record loads (see useStoreSetting). Defaults to the
// store default until the first load completes.
let ACTIVE_CURRENCY = DEFAULT_SETTING.currency;
export function setActiveCurrency(code) { ACTIVE_CURRENCY = (code || DEFAULT_SETTING.currency).toUpperCase(); }
export function getActiveCurrency() { return ACTIVE_CURRENCY; }

// Read-only: returns the merged record (or defaults) without creating.
// Safe for unauthenticated/public storefront pages.
export async function getStoreSetting() {
  const list = await base44.entities.Setting.filter({ key: KEY }).catch(() => []);
  const rec = list && list[0];
  return { ...DEFAULT_SETTING, ...(rec || {}) };
}

// Admin: returns the existing record, creating one from defaults if it
// doesn't exist yet. Only the admin Settings page calls this.
export async function ensureStoreSetting() {
  const list = await base44.entities.Setting.filter({ key: KEY });
  if (list && list[0]) return { ...DEFAULT_SETTING, ...list[0] };
  return await base44.entities.Setting.create({ ...DEFAULT_SETTING });
}

export async function patchStoreSetting(id, patch) {
  return await base44.entities.Setting.update(id, patch);
}

// Resolve the tax rule that applies to the given country/region. Specific
// region rules win over a blank / "*" default rule. Returns the added
// (exclusive) tax amount; inclusive rules add nothing because the prices
// already include tax. Returns 0 when no rule is configured.
export function computeTax(taxable, country, taxRules = []) {
  if (!Array.isArray(taxRules) || taxRules.length === 0) return 0;
  const c = (country || "").toLowerCase().trim();
  const isDefault = (r) => {
    const reg = (r.region || "").toLowerCase().trim();
    return !reg || reg === "*" || reg === "all";
  };
  const specific = taxRules.find((r) => {
    if (isDefault(r)) return false;
    const reg = (r.region || "").toLowerCase().trim();
    return reg === c || c.includes(reg) || reg.includes(c);
  });
  const def = taxRules.find(isDefault);
  const rule = specific || def;
  if (!rule || !Number(rule.rate)) return 0;
  if (rule.inclusive) return 0; // prices already include tax — no amount to add
  return Math.round(((Number(taxable) || 0) * (Number(rule.rate) / 100)) * 100) / 100;
}

// Resolve the shipping fee for the given country from the configured zones.
// Falls back to the first zone when none matches. Free when subtotal reaches
// the zone's free-shipping threshold, or when no zones are configured at all.
export function computeShipping(subtotal, country, shippingZones = []) {
  if (!Array.isArray(shippingZones) || shippingZones.length === 0) return 0;
  const c = (country || "").toLowerCase().trim();
  const match = shippingZones.find((z) =>
    (z.regions || []).some((r) => {
      const rr = (r || "").toLowerCase().trim();
      return rr && (rr === c || c.includes(rr) || rr.includes(c));
    })
  );
  const zone = match || shippingZones[0];
  const rate = Number(zone.rate) || 0;
  const threshold = zone.free_shipping_threshold;
  if (threshold !== null && threshold !== undefined && threshold !== "" && Number(subtotal) >= Number(threshold)) return 0;
  return rate;
}

export const PAYMENT_LABELS = {
  card: { en: "Card", ar: "بطاقة" },
  cod: { en: "Cash on delivery", ar: "الدفع عند الاستلام" },
  upi: { en: "UPI", ar: "UPI" },
  wallet: { en: "Wallet", ar: "محفظة" },
  net_banking: { en: "Net banking", ar: "تحويل مصرفي" },
};