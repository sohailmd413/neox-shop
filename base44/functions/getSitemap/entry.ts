import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public XML sitemap listing all active products and categories. No auth —
// sitemaps must be crawlable. Reads via the service role since product/category
// records are public storefront content. Served at /functions/getSitemap and
// referenced from robots.txt.
export default async function(req) {
  try {
    const host = req.headers.get('host') || 'neox-shop.base44.app';
    const origin = new URL(req.url, `https://${host}`).origin;
    const base44 = createClientFromRequest(req);
    const [products, categories] = await Promise.all([
      base44.asServiceRole.entities.Product.filter({ status: "active" }, "-updated_date", 5000),
      base44.asServiceRole.entities.Category.filter({ active: true }, "sort_order", 1000),
    ]);
    const urls = [];
    const add = (path, lastmod, changefreq, priority) => {
      const lm = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : "";
      urls.push(`  <url><loc>${origin}${path}</loc>${lm}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`);
    };
    add("/", new Date().toISOString(), "daily", "1.0");
    add("/shop", new Date().toISOString(), "daily", "0.9");
    (categories || []).forEach((c) => {
      const ref = c.slug || c.name;
      if (ref) add(`/shop?category=${encodeURIComponent(ref)}`, c.updated_date, "daily", "0.7");
    });
    (products || []).forEach((p) => {
      const ref = p.slug || p.id;
      if (ref) add(`/product/${ref}`, p.updated_date, "weekly", "0.8");
    });
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}