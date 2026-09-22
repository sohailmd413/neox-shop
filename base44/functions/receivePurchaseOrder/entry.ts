import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Receiving a purchase order increments the real stock_quantity of each
// affected product server-side (so inventory can't be tampered with from the
// client) and advances the PO status to partially_received or received.
// Only admin / product_manager staff may call it.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'product_manager') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const poId = body.po_id;
    const received = Array.isArray(body.received) ? body.received : [];
    if (!poId || typeof poId !== 'string') {
      return Response.json({ error: 'po_id is required' }, { status: 400 });
    }

    const po = await base44.asServiceRole.entities.PurchaseOrder.get(poId);
    if (!po) return Response.json({ error: 'Purchase order not found' }, { status: 404 });
    if (po.status === 'received' || po.status === 'cancelled') {
      return Response.json({ error: `PO is ${po.status} and cannot be received` }, { status: 400 });
    }

    const items = (Array.isArray(po.items) ? po.items : []).map((it) => ({ ...it }));
    const recvMap = {};
    for (const r of received) {
      if (!r || !r.product_id) continue;
      const q = Number(r.quantity);
      if (q > 0) recvMap[r.product_id] = (recvMap[r.product_id] || 0) + q;
    }

    const stockUpdates = [];
    let allFullyReceived = items.length > 0;
    for (const it of items) {
      const addQty = recvMap[it.product_id] || 0;
      if (addQty > 0) {
        const product = await base44.asServiceRole.entities.Product.get(it.product_id).catch(() => null);
        if (product) {
          const current = Number(product.stock) || 0;
          const nextStock = current + addQty;
          const nextStatus = nextStock > 0 ? 'in_stock' : product.stock_status;
          await base44.asServiceRole.entities.Product.update(it.product_id, {
            stock: nextStock,
            stock_status: nextStatus,
          });
          stockUpdates.push({ product_id: it.product_id, added: addQty, new_stock: nextStock });
        }
        it.received_quantity = (Number(it.received_quantity) || 0) + addQty;
      }
      const qty = Number(it.quantity) || 0;
      if ((Number(it.received_quantity) || 0) < qty) allFullyReceived = false;
    }

    const nextStatus = allFullyReceived ? 'received' : 'partially_received';
    await base44.asServiceRole.entities.PurchaseOrder.update(poId, {
      items,
      status: nextStatus,
    });

    return Response.json({ ok: true, status: nextStatus, stockUpdates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}