// Shared browser push dispatch: resolves a customer's push subscriptions,
// respects their per-type push preferences, sends the push via webPush.ts,
// and cleans up dead (404/410) subscriptions so we never silently retry
// revoked browser endpoints.
import { sendWebPush } from "./webPush.ts";
import { secrets } from "base44:runtime";

const PREF_DEFAULTS = { enabled: true, order_updates: true, price_drops: true, restocks: true, broadcasts: true };

// Granular per-type preference check. Broadcasts are promotional and
// additionally require marketing_opt_in; the others are transactional
// (triggered by an action the customer took) so marketing consent is N/A.
export function pushPrefAllows(user: any, type: string): boolean {
  if (!user) return false;
  const p = user.push_preferences || PREF_DEFAULTS;
  if (p.enabled === false) return false;
  if (type === "order_updates") return p.order_updates !== false;
  if (type === "price_drops") return p.price_drops !== false;
  if (type === "restocks") return p.restocks !== false;
  if (type === "broadcasts") return user.marketing_opt_in === true && p.broadcasts !== false;
  return true;
}

// Send a push to a logged-in customer. Returns { sent, reason?, cleaned? }.
export async function sendPushToCustomer(base44: any, customerId: string, type: string, payload: { title?: string; body?: string; url?: string; tag?: string }) {
  if (!customerId) return { sent: 0, reason: "no_customer" };
  const user = await base44.asServiceRole.entities.User.get(customerId).catch(() => null);
  if (!user) return { sent: 0, reason: "no_user" };
  if (!pushPrefAllows(user, type)) return { sent: 0, reason: "pref_disabled" };
  const subs = await base44.asServiceRole.entities.PushSubscription.filter({ customer_id: customerId }, "-created_date", 50) || [];
  if (!subs.length) return { sent: 0, reason: "no_subscription" };
  return dispatchPush(base44, subs, payload, user.language);
}

async function dispatchPush(base44: any, subs: any[], payload: any, lang: string) {
  const vapidKey = secrets.get("VAPID_PRIVATE_KEY");
  if (!vapidKey) return { sent: 0, reason: "no_vapid_key" };
  const data = {
    title: payload.title || "NeoX Shop",
    body: payload.body || "",
    url: payload.url || "/",
    tag: payload.tag,
    lang: lang === "ar" ? "ar" : "en",
    dir: lang === "ar" ? "rtl" : "ltr",
  };
  let sent = 0;
  const dead: string[] = [];
  for (const s of subs) {
    try {
      const r = await sendWebPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, JSON.stringify(data), vapidKey);
      if (r.ok) sent++;
      else if (r.status === 404 || r.status === 410) dead.push(s.id);
    } catch (e) {
      // network error — leave the subscription; will retry next time
    }
  }
  // Clean up revoked/expired subscriptions instead of failing silently forever.
  for (const id of dead) {
    await base44.asServiceRole.entities.PushSubscription.delete(id).catch(() => {});
  }
  return { sent, cleaned: dead.length };
}