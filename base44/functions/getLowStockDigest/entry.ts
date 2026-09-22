import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Daily low-stock digest (invoked by the "Low Stock Digest" workflow, or
// manually by an admin for testing). Computes products at or below their
// reorder threshold (per-product reorder_threshold, falling back to the
// store's reorder_threshold_default), then creates one in-app Notification
// per admin / product_manager user (deduped per day) and emails each a
// short summary so reordering doesn't rely on someone remembering to check.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const setting = await base44.asServiceRole.entities.Setting
      .filter({ key: "store" })
      .then((r) => (r && r[0]) || {})
      .catch(() => ({}));
    const defaultThreshold = Number(setting.reorder_threshold_default) || 5;

    const products = await base44.asServiceRole.entities.Product.list("-created_date", 2000) || [];
    const low = products.filter((p) => {
      if (p.status === "archived" || p.status === "draft") return false;
      const t = Number(p.reorder_threshold);
      const threshold = !Number.isNaN(t) && t > 0 ? t : defaultThreshold;
      return (Number(p.stock) || 0) <= threshold;
    });

    const today = new Date().toISOString().slice(0, 10);

    const users = await base44.asServiceRole.entities.User.list("-created_date", 500) || [];
    const recipients = users.filter((u) => u.role === "admin" || u.role === "product_manager");

    let notified = 0;
    let emailed = 0;
    for (const u of recipients) {
      // Dedupe per recipient per day.
      const existing = await base44.asServiceRole.entities.Notification.filter({
        recipient_id: u.id,
        ref_type: "low_stock_digest",
        ref_id: today,
      }).then((r) => r || []).catch(() => []);
      if (existing.length > 0) continue;

      const count = low.length;
      const message = `${count} product${count === 1 ? "" : "s"} below the reorder threshold. Review and create purchase orders in Operations → Low stock.`;
      await base44.asServiceRole.entities.Notification.create({
        recipient_id: u.id,
        type: "info",
        message,
        ref_type: "low_stock_digest",
        ref_id: today,
      }).catch(() => {});
      notified++;

      if (u.email) {
        const lines = low.slice(0, 20).map((p) => `- ${p.name} (stock ${p.stock})`).join("\n");
        const more = low.length > 20 ? `\n…and ${low.length - 20} more` : "";
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: u.email,
          subject: `Low-stock digest — ${count} item${count === 1 ? "" : "s"} need reordering`,
          body: `${message}\n\nProducts below threshold:\n${lines}${more}`,
        }).then(() => { emailed++; }).catch(() => {});
      }
    }

    return Response.json({ ok: true, low_count: low.length, notified, emailed, date: today });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}