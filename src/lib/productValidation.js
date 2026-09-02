// Required-field checks for publishing a product.
// Each check maps to a tab so the dialog can jump to the first incomplete field.
export const REQUIRED_CHECKS = [
  { key: "name", label: "Product name", tab: "general", test: (f) => !!(f.name && f.name.trim()), msg: "Product name is required" },
  { key: "category", label: "Category", tab: "general", test: (f) => !!(f.category && String(f.category).trim()), msg: "Select at least one category" },
  { key: "images", label: "Product image", tab: "media", test: (f) => Array.isArray(f.images) && f.images.length >= 1, msg: "Add at least one product image" },
  { key: "price", label: "Selling price", tab: "pricing", test: (f) => Number(f.price) > 0, msg: "Enter a selling price" },
  { key: "tax_class", label: "Tax class / HSN", tab: "pricing", test: (f) => !!(f.tax_class && String(f.tax_class).trim()), msg: "Tax class / HSN code is required" },
  { key: "stock", label: "Stock", tab: "inventory", test: (f) => Number(f.stock) > 0 || f.stock_status === "preorder", msg: "Enter stock quantity or allow backorders" },
  { key: "description", label: "Description", tab: "general", test: (f) => (f.description || "").trim().length >= 50, msg: "Description must be at least 50 characters" },
];

export const REQUIRED_COUNT = REQUIRED_CHECKS.length;

export function productCompletion(form) {
  const done = REQUIRED_CHECKS.filter((c) => c.test(form)).length;
  return Math.round((done / REQUIRED_COUNT) * 100);
}

export function validateProduct(form) {
  const missing = REQUIRED_CHECKS.filter((c) => !c.test(form));
  const errors = {};
  missing.forEach((c) => {
    errors[c.key] = { key: c.key, msg: c.msg, tab: c.tab, label: c.label };
  });
  return {
    valid: missing.length === 0,
    errors,
    missingCount: missing.length,
    total: REQUIRED_COUNT,
    firstTab: missing[0]?.tab,
    firstKey: missing[0]?.key,
    missing,
  };
}

export const genSku = () => `SKU-${Date.now().toString(36).toUpperCase().slice(-6)}`;

export const hasAnyData = (f) =>
  !!(f.name || f.category || f.price || f.stock || f.sku || f.tax_class || f.brand || f.description || (Array.isArray(f.images) && f.images.length));