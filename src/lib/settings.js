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
};

const KEY = "store";

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