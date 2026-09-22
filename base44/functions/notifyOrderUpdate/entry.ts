import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendPushToCustomer } from "../../shared/push.ts";

// Sends a browser push + in-app notification to a customer when their order
// status changes (ties into the existing Order Tracking Timeline). Invoked by
// the admin Order drawer after a status save. Staff-only: admins and delivery
// managers may trigger it. Guest orders (no user_id) get no push (email is the
// only channel for guests) — returns sent:0 reason:guest_order.
const STATUS_LABELS = {
  pending: "received",
  paid: "paid",
  packed: "packed",
  shipped: "shipped",
  out_for_delivery: "out for delivery",
  delivered: "delivered",
  cancelled: "cancelled",
  refunded: "refunded",
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "delivery_manager"].includes(user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const { orderId, status } = await req.json().catch(() => ({}));
    if (!orderId || !status) return Response.json({ error: "orderId, status required" }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(orderId).catch(() => null);
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
    const customerId = order.user_id || order.created_by_id;
    if (!customerId) return Response.json({ ok: true, sent: 0, reason: "guest_order" });

    const label = STATUS_LABELS[status] || status;
    const cust = await base44.asServiceRole.entities.User.get(customerId).catch(() => ({}));
    const ar = cust.language === "ar";
    const ref = (order.id || "").slice(-6).toUpperCase();
    const title = ar ? "تحديث طلبك" : "Order update";
    const body = ar ? `طلبك رقم ${ref} أصبح: ${label}` : `Your order #${ref} is now ${label}`;
    const url = `/orders/${order.id}`;

    try {
      await base44.asServiceRole.entities.Notification.create({
        recipient_id: customerId,
        type: "info",
        message: ar ? `تحديث الطلب: ${label}` : `Order update: ${label}`,
        ref_type: "order",
        ref_id: order.id,
        ref_name: order.id,
      });
    } catch (e) {}

    const push = await sendPushToCustomer(base44, customerId, "order_updates", {
      title,
      body,
      url,
      tag: `order-${order.id}`,
    });
    return Response.json({ ok: true, sent: push.sent, reason: push.reason || null, cleaned: push.cleaned || 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}