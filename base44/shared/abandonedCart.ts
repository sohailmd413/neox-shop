// Shared helpers for abandoned-cart recovery, used by the scheduled processor
// and the admin manual-trigger function so config reads, token/code generation
// and the reminder email stay in one place. All calls operate as the service
// role (the authoritative cart data is admin-only and reminders are
// system-authored), so callers pass their service-role-capable base44 client.

export async function getRecoveryConfig(base44) {
  const list = await base44.asServiceRole.entities.Setting.filter({ key: "store" });
  const s = (list && list[0]) || {};
  const num = (v) => (v === null || v === undefined || v === "") ? null : Number(v);
  return {
    enabled: s.abandoned_cart_recovery_enabled === true,
    delayHours: Number(s.abandoned_cart_delay_hours) || 1,
    secondEnabled: s.abandoned_cart_second_reminder_enabled === true,
    secondHours: Number(s.abandoned_cart_second_reminder_hours) || 24,
    discountEnabled: s.abandoned_cart_discount_enabled === true,
    discountPercent: Number(s.abandoned_cart_discount_percent) || 0,
    respectOptOut: s.abandoned_cart_respect_opt_out === true,
    storeName: s.store_name || "NeoX Shop",
    contactEmail: s.contact_email || "",
    currency: s.currency || "SAR",
  };
}

// Opaque restore token for the recovery link.
export function genToken() {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Single-use recovery coupon code, e.g. SAVE-3F9A2C71.
export function genCouponCode() {
  const b = new Uint8Array(5);
  crypto.getRandomValues(b);
  return "SAVE-" + Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase().slice(0, 8);
}

export function money(n, currency) {
  return `${Number(n || 0).toFixed(2)} ${currency || "SAR"}`;
}

// Build and send one recovery email with the cart contents and a restore link.
// num = 1 (first reminder) or 2 (second nudge, optionally with a coupon code).
export async function sendReminderEmail(base44, config, cart, num, couponCode, origin) {
  const items = Array.isArray(cart.items) ? cart.items : [];
  const cur = config.currency || "SAR";
  const rows = items.map((i) => {
    const lineTotal = (Number(i.price) || 0) * (Number(i.quantity) || 0);
    return `<tr>
      <td style="padding:8px 10px;border:1px solid #e5e7eb">${i.name || ""}</td>
      <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center">${i.quantity || 1}</td>
      <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:right">${money(lineTotal, cur)}</td>
    </tr>`;
  }).join("");
  const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const restoreUrl = `${origin}/recover-cart?token=${cart.restore_token}`;
  const firstName = ((cart.customer_name || "").split(" ")[0] || "there").trim();
  const subject = num === 1
    ? `You left something in your cart at ${config.storeName}`
    : `Still thinking it over? Here's ${config.discountPercent}% off your cart at ${config.storeName}`;

  let html = `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
    <h2 style="margin:0 0 8px">Hi ${firstName},</h2>
    <p style="margin:0 0 16px;color:#475569">You left some great items in your cart. They're still waiting for you — tap below to pick up right where you left off.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:0 0 16px">${rows}</table>
    <p style="margin:0 0 16px;font-weight:600">Total: ${money(total, cur)}</p>`;
  if (num === 2 && couponCode) {
    html += `<p style="margin:0 0 8px">To help you finish your order, here's <strong>${config.discountPercent}% off</strong> your cart:</p>
      <p style="margin:0 0 16px"><span style="display:inline-block;padding:10px 18px;border:2px dashed #0f172a;border-radius:8px;font-size:18px;font-weight:700;letter-spacing:1px">${couponCode}</span></p>
      <p style="margin:0 0 16px;color:#475569">Enter this code at checkout. Single use, expires in 48 hours.</p>`;
  }
  html += `<a href="${restoreUrl}" style="display:inline-block;background:#0B1E3D;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600">Restore my cart</a>
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">This link will load your cart and take you straight to checkout. If you didn't mean to leave items behind, you can ignore this email.</p>
    </div>`;

  await base44.asServiceRole.integrations.Core.SendEmail({ to: cart.email, subject, html });
}