export function formatPrice(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "SAR",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
  }).format(n);
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Returns a localized field for an entity. When the site language is Arabic
 * and the entity has a `_ar` variant of the field, that variant is used;
 * otherwise the default (English) value is returned.
 * @param {object} entity - the product/category record
 * @param {string} key - base field name, e.g. "name" or "description"
 * @param {"en"|"ar"} lang - current site language
 */
export function lf(entity, key, lang) {
  if (lang === "ar") {
    const ar = entity?.[`${key}_ar`];
    if (ar && String(ar).trim()) return ar;
  }
  return entity?.[key] ?? "";
}