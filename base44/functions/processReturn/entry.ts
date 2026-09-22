import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getReturnsConfig, computeRefundAmount, isFullReturn, clawbackPointsForReturn, creditPointsForReturn, issueStoreCreditCoupon } from "../../shared/returns.ts";

// Admin return processing. action = approve | reject | item_received | refund.
// Approve computes the refund amount and notifies the customer with return
// shipping instructions. Reject requires a reason. item_received gates the
// refund (unless refund_on_approval is on). refund issues the actual refund per
// the requested method, claws back proportional loyalty points, and sets a
// full return's order to 'refunded'. original_payment refunds require Stripe to
// be wired — otherwise the action is blocked with a clear message (no silent
// failure). Admin-only; all math server-side.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const returnId = body.return_id;
    if (!returnId || !action) return Response.json({ error: 'return_id and action required' }, { status: 400 });
    const rr = await base44.asServiceRole.entities.ReturnRequest.get(returnId);
    if (!rr) return Response.json({ error: 'Return request not found' }, { status: 404 });
    const order = await base44.asServiceRole.entities.Order.get(rr.order_id).catch(() => null);
    const customerId = rr.customer_id || (order && (order.user_id || order.created_by_id));
    const orderRef = `#${String(rr.order_id || '').slice(-8).toUpperCase()}`;

    const notifyCustomer = async (message, type, reason) => {
      if (!customerId) return;
      try { await base44.asServiceRole.entities.Notification.create({ recipient_id: customerId, type: type || 'info', message, ref_type: 'return', ref_id: rr.id, ref_name: orderRef, reason }); } catch {}
      try { await base44.asServiceRole.integrations.Core.SendEmail({ to: (order && order.customer_email) || '', subject: 'Return update', body: message }); } catch {}
    };

    if (action === 'approve') {
      if (rr.status !== 'requested') return Response.json({ error: 'Already processed.' }, { status: 400 });
      const config = await getReturnsConfig(base44);
      const refund = computeRefundAmount(order || {}, rr.items);
      await base44.asServiceRole.entities.ReturnRequest.update(returnId, { status: 'approved', refund_amount: refund, admin_notes: body.admin_notes || rr.admin_notes });
      const instr = config.returnShippingInstructions || 'Please ship the item(s) back to our returns address.';
      await notifyCustomer(`Your return for order ${orderRef} was approved. ${instr}`, 'approved');
      return Response.json({ ok: true, status: 'approved', refund_amount: refund });
    }

    if (action === 'reject') {
      if (rr.status !== 'requested') return Response.json({ error: 'Already processed.' }, { status: 400 });
      const reason = (body.rejection_reason || '').toString().trim();
      if (!reason) return Response.json({ error: 'A rejection reason is required.' }, { status: 400 });
      await base44.asServiceRole.entities.ReturnRequest.update(returnId, { status: 'rejected', rejection_reason: reason, admin_notes: body.admin_notes || rr.admin_notes, resolved_at: new Date().toISOString() });
      await notifyCustomer(`Your return for order ${orderRef} was rejected: ${reason}`, 'rejected', reason);
      return Response.json({ ok: true, status: 'rejected' });
    }

    if (action === 'item_received') {
      if (rr.status !== 'approved') return Response.json({ error: 'Mark as received is only available after approval.' }, { status: 400 });
      await base44.asServiceRole.entities.ReturnRequest.update(returnId, { status: 'item_received' });
      await notifyCustomer(`We received your returned item(s) for order ${orderRef}. Your refund will be processed shortly.`, 'info');
      return Response.json({ ok: true, status: 'item_received' });
    }

    if (action === 'refund') {
      const config = await getReturnsConfig(base44);
      const canRefund = config.refundOnApproval ? rr.status === 'approved' : rr.status === 'item_received';
      if (!canRefund) return Response.json({ error: config.refundOnApproval ? 'Approve the return first.' : 'Mark the item as received before refunding.' }, { status: 400 });
      const refund = Number(rr.refund_amount) || computeRefundAmount(order || {}, rr.items);
      if (refund <= 0) return Response.json({ error: 'Refund amount is zero.' }, { status: 400 });
      const method = rr.requested_refund_method || 'original_payment';
      let result = {};

      if (method === 'store_credit') {
        const { code } = await issueStoreCreditCoupon(base44, customerId, refund);
        result = { store_credit_code: code };
      } else if (method === 'loyalty_points') {
        const { credited } = await creditPointsForReturn(base44, customerId, refund);
        result = { loyalty_points_credited: credited };
      } else {
        // original_payment → real Stripe refund. The Stripe integration is not
        // wired yet (no payment is captured at checkout), so this is explicitly
        // blocked rather than silently failing. When Stripe is installed and
        // order.stripe_payment_id is populated, issue the refund via the Stripe
        // refunds API here.
        return Response.json({ error: 'Original-payment refunds require the Stripe integration to be wired (install Stripe and capture a payment_intent on the order). This return is blocked until then — no refund was issued.' }, { status: 400 });
      }

      // Claw back proportional loyalty points earned on the returned items.
      const claw = await clawbackPointsForReturn(base44, customerId, rr.order_id, order || {}, rr.items);

      // A full return moves the order to 'refunded'; a partial return keeps it delivered.
      if (order && isFullReturn(order, rr.items)) {
        await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'refunded',
          timeline: [...(order.timeline || []), { status: 'refunded', by: user.full_name || 'admin', at: new Date().toISOString() }],
        });
      }

      await base44.asServiceRole.entities.ReturnRequest.update(returnId, { status: 'refunded', resolved_at: new Date().toISOString(), admin_notes: body.admin_notes || rr.admin_notes });
      await notifyCustomer(`Your refund for order ${orderRef} was processed (${method}).`, 'info');
      return Response.json({ ok: true, status: 'refunded', refund_amount: refund, method, clawed_points: claw.clawed, ...result });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}