import Papa from "papaparse";

// Maps each Arabic (_ar) field to its English reference field + the CSV column
// headers used on export/import. One row per record in the exported file; only
// the _ar columns that are actually missing for that record are emitted, and
// each is paired with its read-only English reference column. Import only ever
// writes back the _ar fields present in the file — English columns are ignored.
export const FIELD_CONFIG = {
  Product: [
    { arKey: "name_ar", enKey: "name", enCol: "name_en", arCol: "name_ar" },
    { arKey: "description_ar", enKey: "description", enCol: "description_en", arCol: "description_ar" },
  ],
  Category: [
    { arKey: "name_ar", enKey: "name", enCol: "name_en", arCol: "name_ar" },
    { arKey: "description_ar", enKey: "description", enCol: "description_en", arCol: "description_ar" },
    { arKey: "short_description_ar", enKey: "short_description", enCol: "short_description_en", arCol: "short_description_ar" },
  ],
  Poster: [
    { arKey: "tagline_ar", enKey: "tagline", enCol: "tagline_en", arCol: "tagline_ar" },
    { arKey: "cta_text_ar", enKey: "cta_text", enCol: "cta_text_en", arCol: "cta_text_ar" },
  ],
  Setting: [
    { arKey: "store_name_ar", enKey: "store_name", enCol: "store_name_en", arCol: "store_name_ar" },
    { arKey: "business_address_ar", enKey: "business_address", enCol: "business_address_en", arCol: "business_address_ar" },
    { arKey: "terms_policy_ar", enKey: "terms_policy", enCol: "terms_policy_en", arCol: "terms_policy_ar" },
    { arKey: "privacy_policy_ar", enKey: "privacy_policy", enCol: "privacy_policy_en", arCol: "privacy_policy_ar" },
    { arKey: "return_policy_ar", enKey: "return_policy", enCol: "return_policy_en", arCol: "return_policy_ar" },
    { arKey: "shipping_policy_ar", enKey: "shipping_policy", enCol: "shipping_policy_en", arCol: "shipping_policy_ar" },
  ],
};

const TYPE_ORDER = ["Product", "Category", "Poster", "Setting"];

// Build a single CSV string from the auditArabicFields response. Only _ar fields
// that are flagged missing are included (paired with their English reference),
// so already-translated content is never re-exported (and can't be overwritten
// on import, since blank _ar cells are skipped).
export function buildExportCsv(data) {
  const needed = new Set();
  const specs = [];

  const push = (entityType, id, missing, enGetter) => {
    for (const arKey of missing || []) {
      const f = (FIELD_CONFIG[entityType] || []).find((c) => c.arKey === arKey);
      if (!f) continue;
      needed.add(arKey);
      specs.push({ entityType, id, field: f, enValue: enGetter(f.enKey) || "" });
    }
  };

  (data.products || []).forEach((r) => push("Product", r.id, r.missing, (k) => r[k]));
  (data.categories || []).forEach((r) => push("Category", r.id, r.missing, (k) => r[k]));
  (data.posters || []).forEach((r) => push("Poster", r.id, r.missing, (k) => r[k]));
  if (data.settings && (data.settings.missing || []).length) {
    push("Setting", data.settings.id, data.settings.missing, (k) => (data.settings.refs || {})[k] || "");
  }

  // Stable column order: entity_type, id, then en/ar pairs in config order.
  const columns = ["entity_type", "id"];
  for (const et of TYPE_ORDER) {
    for (const f of FIELD_CONFIG[et] || []) {
      if (needed.has(f.arKey)) {
        columns.push(f.enCol);
        columns.push(f.arCol);
      }
    }
  }
  // Dedup any repeated en/ar columns while preserving order.
  const cols = [...new Set(columns)];

  const rows = specs.map((s) => {
    const o = { entity_type: s.entityType, id: s.id };
    o[s.field.enCol] = s.enValue;
    o[s.field.arCol] = "";
    return o;
  });

  return "\uFEFF" + Papa.unparse(rows, { columns: cols });
}

// Parse a translations CSV back into grouped updates. Returns:
//  - byType: { Product: [{id, updates:{arKey:value}}], ... } (only rows with at
//    least one non-blank _ar cell; duplicate ids are merged)
//  - warnings: [{row, entityType, id, field, en, ar}] where Arabic equals English
//  - skippedEmpty: count of rows that had an id+entity but no fillable _ar field
//  - totalRows: parsed data rows
export function parseImportCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        const rows = (results.data || []).filter((r) => r.id && r.entity_type);
        const byType = { Product: [], Category: [], Poster: [], Setting: [] };
        let skippedEmpty = 0;
        const warnings = [];

        rows.forEach((r, idx) => {
          const et = String(r.entity_type).trim();
          const cfgs = FIELD_CONFIG[et];
          if (!cfgs) return;
          const fields = {};
          for (const f of cfgs) {
            const ar = String(r[f.arCol] || "").trim();
            const en = String(r[f.enCol] || "").trim();
            if (ar) {
              fields[f.arKey] = ar;
              if (en && ar.toLowerCase() === en.toLowerCase()) {
                warnings.push({ row: idx + 2, entityType: et, id: r.id, field: f.arKey, en, ar });
              }
            }
          }
          if (Object.keys(fields).length) {
            const existing = byType[et].find((x) => x.id === r.id);
            if (existing) Object.assign(existing.updates, fields);
            else byType[et].push({ id: r.id, updates: fields });
          } else {
            skippedEmpty++;
          }
        });

        resolve({ byType, warnings, skippedEmpty, totalRows: rows.length });
      },
      error: (err) => reject(err),
    });
  });
}