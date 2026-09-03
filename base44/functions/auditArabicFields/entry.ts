import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// One-time translations audit. Returns every product / category / poster /
// store-settings record that is missing a required Arabic counterpart field,
// so an admin can complete legacy content before it silently breaks the
// Arabic storefront. Admin-only — any non-admin is rejected with 403.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const blank = (s) => !s || !String(s).trim();

    const [products, categories, posters, settingsList] = await Promise.all([
      base44.asServiceRole.entities.Product.list(500),
      base44.asServiceRole.entities.Category.list(500),
      base44.asServiceRole.entities.Poster.list(500),
      base44.asServiceRole.entities.Setting.list(10),
    ]);

    const productFields = (p) => {
      const missing = [];
      if (blank(p.name_ar)) missing.push("name_ar");
      if (blank(p.description_ar)) missing.push("description_ar");
      return missing;
    };
    const categoryFields = (c) => {
      const missing = [];
      if (blank(c.name_ar)) missing.push("name_ar");
      if (!blank(c.description) && blank(c.description_ar)) missing.push("description_ar");
      return missing;
    };
    const posterFields = (p) => {
      const missing = [];
      if (!blank(p.tagline) && blank(p.tagline_ar)) missing.push("tagline_ar");
      if (!blank(p.cta_text) && blank(p.cta_text_ar)) missing.push("cta_text_ar");
      return missing;
    };

    const productRows = (products || [])
      .map((p) => ({ id: p.id, name: p.name, status: p.status, missing: productFields(p) }))
      .filter((r) => r.missing.length);
    const categoryRows = (categories || [])
      .map((c) => ({ id: c.id, name: c.name, status: c.status, missing: categoryFields(c) }))
      .filter((r) => r.missing.length);
    const posterRows = (posters || [])
      .map((p) => ({ id: p.id, title: p.title, active: p.active, missing: posterFields(p) }))
      .filter((r) => r.missing.length);

    const setting = (settingsList || [])[0] || {};
    const settingMissing = [];
    if (blank(setting.store_name_ar)) settingMissing.push("store_name_ar");
    if (blank(setting.business_address_ar)) settingMissing.push("business_address_ar");
    if (blank(setting.terms_policy_ar)) settingMissing.push("terms_policy_ar");
    if (blank(setting.privacy_policy_ar)) settingMissing.push("privacy_policy_ar");
    if (blank(setting.return_policy_ar)) settingMissing.push("return_policy_ar");
    if (blank(setting.shipping_policy_ar)) settingMissing.push("shipping_policy_ar");

    return Response.json({
      products: productRows,
      categories: categoryRows,
      posters: posterRows,
      settings: { id: setting.id || null, missing: settingMissing },
      totals: {
        products: productRows.length,
        categories: categoryRows.length,
        posters: posterRows.length,
        settings: settingMissing.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}