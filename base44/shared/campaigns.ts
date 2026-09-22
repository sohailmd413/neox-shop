// Shared campaign send logic, used by the sendCampaign (manual/test) and
// processScheduledCampaigns (scheduled job) backend functions. Server-side only.

const STAFF_ROLES = ["admin", "product_manager", "delivery_manager", "marketing_manager"];
const INACTIVE_DAYS = 90;

function pickLocalized(campaign, lang) {
  const ar = lang === "ar";
  const subject = ar ? (campaign.subject_ar || campaign.subject_en) : (campaign.subject_en || campaign.subject_ar);
  const html = ar ? (campaign.content_html_ar || campaign.content_html_en) : (campaign.content_html_en || campaign.content_html_ar);
  return { subject, html };
}

async function getStoreName(base44) {
  const s = await base44.asServiceRole.entities.Setting
    .filter({ key: "store" })
    .then((r) => (r && r[0]) || {})
    .catch(() => ({}));
  return s.store_name || "Our store";
}

function wrapHtml(lang, html, storeName) {
  const dir = lang === "ar" ? "rtl" : "ltr";
  const footer = lang === "ar"
    ? "تصل هذه الرسالة لأنك اشتركت في رسائلنا التسويقية. يمكنك إدارة تفضيلاتك من حسابك."
    : "You receive this because you opted in to marketing emails. Manage preferences in your account.";
  return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
<tr><td style="padding:20px 24px;font-size:14px;font-weight:600;color:#0f172a;">${storeName}</td></tr>
<tr><td style="padding:0 24px 20px;">${html || ""}</td></tr>
<tr><td style="padding:12px 24px 24px;font-size:11px;color:#94a3b8;">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

// Resolve a campaign's target segment into an actual recipient list, strictly
// filtered by marketing_opt_in === true. Opted-out customers are never included
// regardless of segment match.
export async function resolveRecipients(base44, campaign) {
  const users = await base44.asServiceRole.entities.User.list("-created_date", 2000) || [];
  const optedIn = users.filter((u) => u && u.id && !STAFF_ROLES.includes(u.role) && u.marketing_opt_in === true && u.email);
  const toRecip = (u) => ({ email: u.email, language: u.language === "ar" ? "ar" : "en", name: u.display_name || u.full_name || "" });

  const seg = campaign.target_segment;
  if (seg === "all_opted_in") return optedIn.map(toRecip);

  const orders = await base44.asServiceRole.entities.Order.list("-created_date", 2000) || [];
  const metrics = new Map();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    const uid = o.user_id || o.created_by_id;
    if (!uid) continue;
    const e = metrics.get(uid) || { total_orders: 0, total_spend: 0, last_at: 0 };
    e.total_orders += 1;
    e.total_spend += Number(o.total) || 0;
    const t = new Date(o.created_date).getTime();
    if (t > e.last_at) e.last_at = t;
    metrics.set(uid, e);
  }

  if (seg === "vip_customers") {
    const ranked = optedIn
      .map((u) => ({ u, m: metrics.get(u.id) || { total_spend: 0 } }))
      .filter((x) => (x.m.total_spend || 0) > 0)
      .sort((a, b) => (b.m.total_spend || 0) - (a.m.total_spend || 0));
    const vipCount = Math.max(1, Math.ceil(ranked.length * 0.1));
    const vipIds = new Set(ranked.slice(0, vipCount).map((x) => x.u.id));
    return optedIn.filter((u) => vipIds.has(u.id)).map(toRecip);
  }

  if (seg === "inactive_customers") {
    const cutoff = Date.now() - INACTIVE_DAYS * 86400000;
    return optedIn.filter((u) => {
      const m = metrics.get(u.id);
      if (!m || m.total_orders === 0) return false; // must have ordered before
      return m.last_at < cutoff;
    }).map(toRecip);
  }

  if (seg === "specific_category_shoppers") {
    const cat = campaign.target_category || "";
    if (!cat) return [];
    const products = await base44.asServiceRole.entities.Product.list("-created_date", 2000) || [];
    const prodCat = new Map();
    for (const p of products) prodCat.set(p.id, p.category || "");
    const matchIds = new Set();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      (o.items || []).forEach((it) => {
        if (it.product_id && prodCat.get(it.product_id) === cat) matchIds.add(o.user_id || o.created_by_id);
      });
    }
    return optedIn.filter((u) => matchIds.has(u.id)).map(toRecip);
  }

  return [];
}

// Send a campaign to its full resolved segment and mark it sent. Each recipient
// gets the localized subject/body matching their preferred language.
export async function sendCampaignNow(base44, campaign) {
  const storeName = await getStoreName(base44);
  const recipients = await resolveRecipients(base44, campaign);
  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const { subject, html } = pickLocalized(campaign, r.language);
    if (!subject || !html) { failed++; continue; }
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: r.email,
        subject,
        html: wrapHtml(r.language, html, storeName),
      });
      sent++;
    } catch {
      failed++;
    }
  }
  await base44.asServiceRole.entities.Campaign.update(campaign.id, {
    status: "sent",
    sent_count: sent,
    sent_at: new Date().toISOString(),
  });
  return { sent, failed, total: recipients.length };
}

// Preview a campaign in the admin's own inbox (English content).
export async function sendTest(base44, campaign, adminEmail) {
  const storeName = await getStoreName(base44);
  const { subject, html } = pickLocalized(campaign, "en");
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: adminEmail,
    subject: `[TEST] ${subject || campaign.name || "Campaign"}`,
    html: wrapHtml("en", html || "<p>(empty body)</p>", storeName),
  });
  return { sent: 1 };
}