import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getReturnsConfig } from "../../shared/returns.ts";

// Customer creates a return request. Validates the order belongs to the caller,
// is delivered, and is within the return window; validates items belong to the
// order and quantities don't exceed ordered; requires photos for defective /
// not_as_described. Creates the ReturnRequest (status=requested) and notifies
// admin staff + the customer (in-app + best-effort email).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const orderId = body.order_id;
    if (!orderId) return Response.json({ error: 'order_id required' }, { status: 400 });
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    const customerId = order.user_id || order.created_by_id;
    if (!customerId || customerId !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (order.status !== 'delivered') return Response.json({ error: 'Returns are only available for delivered orders.' }, { status: 400 });

    const config = await getReturnsConfig(base44);
    const deliveredEntry = (order.timeline || []).find((e) => e.status === 'delivered');
    const deliveredAt = deliveredEntry ? new Date(deliveredEntry.at) : new Date(order.updated_date || order.created_date);
    const daysSince = (Date.now() - deliveredAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > config.returnWindowDays) return Response.json({ error: `The return window (${config.returnWindowDays} days) has closed for this order.` }, { status: 400 });

    const items = (Array.isArray(body.items) ? body.items : []).filter((i) => i.product_id && Number(i.quantity) > 0);
    if (!items.length) return Response.json({ error: 'Select at least one item to return.' }, { status: 400 });
    for (const ri of items) {
      const oi = (order.items || []).find((i) => i.product_id === ri.product_id);
      if (!oi) return Response.json({ error: 'An item does not belong to this order.' }, { status: 400 });
      if (Number(ri.quantity) > Number(oi.quantity)) return Response.json({ error: 'Return quantity exceeds ordered quantity.' }, { status: 400 });
    }
    const reasonCategory = body.reason_category;
    if (!['defective', 'wrong_item', 'not_as_described', 'changed_mind', 'other'].includes(reasonCategory)) {
      return Response.json({ error: 'Select a reason.' }, { status: 400 });
    }
    const photos = Array.isArray(body.photos) ? body.photos : [];
    if ((reasonCategory === 'defective' || reasonCategory === 'not_as_described') && photos.length === 0) {
      return Response.json({ error: 'Photos are required for defective / not-as-described claims.' }, { status: 400 });
    }
    const refundMethod = body.requested_refund_method || 'original_payment';
    if (!['original_payment', 'store_credit', 'loyalty_points'].includes(refundMethod)) {
      return Response.json({ error: 'Invalid refund method.' }, { status: 400 });
    }

    const created = await base44.asServiceRole.entities.ReturnRequest.create({
      order_id: orderId,
      customer_id: customerId,
      items: items.map((i) => ({ product_id: i.product_id, quantity: Number(i.quantity), reason: i.reason || reasonCategory })),
      reason_category: reasonCategory,
      reason_details: (body.reason_details || '').toString().slice(0, 2000),
      photos,
      requested_refund_method: refundMethod,
      status: 'requested',
    });

    const orderRef = `#${String(orderId).slice(-8).toUpperCase()}`;
    // Notify admin / marketing staff (best-effort).
    try {
      const users = await base44.asServiceRole.entities.User.list();
      for (const a of (users || []).slice(0, 40)) {
        if (a.role === 'admin' || a.role === 'marketing_manager') {
          await base44.asServiceRole.entities.Notification.create({
            recipient_id: a.id,
            type: 'approval_requested',
            message: `New return request for order ${orderRef}`,
            ref_type: 'return',
            ref_id: created.id,
            ref_name: orderRef,
          });
        }
      }
    } catch {}
    // Notify the customer (in-app + best-effort email).
    try {
      await base44.asServiceRole.entities.Notification.create({
        recipient_id: customerId,
        type: 'info',
        message: `Your return request for order ${orderRef} was submitted.`,
        ref_type: 'return',
        ref_id: created.id,
        ref_name: orderRef,
      });
    } catch {}
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: order.customer_email || '',
        subject: 'Your return request was received',
        body: `We received your return request for order ${orderRef}. We'll review it and respond shortly.`,
      });
    } catch {}

    return Response.json({ ok: true, id: created.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}