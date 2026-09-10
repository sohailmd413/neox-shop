import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveCustomer, ownsTicket } from "../../shared/supportChat.ts";

// Returns the customer's active support conversation: the most recent
// non-resolved/non-closed ticket (or a pinned ticket_id) plus its messages and
// the count of unread staff replies. When `mark_read` is true (the customer is
// viewing the panel), staff messages are marked read_by_customer so the bubble
// badge clears; polling with mark_read=false leaves them unread for the badge.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { customerId, email } = await resolveCustomer(base44, body);
    const ticketId = body.ticket_id || null;
    const markRead = body.mark_read === true;

    if (!customerId && !email && !ticketId) {
      return Response.json({ ticket: null, messages: [], unread: 0 });
    }

    let ticket: any = null;
    if (ticketId) {
      try { ticket = await base44.asServiceRole.entities.SupportTicket.get(ticketId); } catch { ticket = null; }
    }
    if (!ticket) {
      let list: any[] = [];
      if (customerId) list = await base44.asServiceRole.entities.SupportTicket.filter({ customer_id: customerId }, "-created_date", 50);
      if ((!list || list.length === 0) && email) list = await base44.asServiceRole.entities.SupportTicket.filter({ customer_email: email }, "-created_date", 50);
      ticket = (list || []).find((t) => t.status !== "closed" && t.status !== "resolved") || (list || [])[0] || null;
    }
    if (!ticket) return Response.json({ ticket: null, messages: [], unread: 0 });
    if (!ownsTicket(ticket, customerId, email) && !(ticketId && (customerId || email))) {
      return Response.json({ ticket: null, messages: [], unread: 0 });
    }

    const messages: any[] = await base44.asServiceRole.entities.SupportMessage.filter({ ticket_id: ticket.id }, "created_date", 500);
    const unreadStaff = (messages || []).filter((m) => m.sender_type === "staff" && !m.read_by_customer);

    if (markRead && unreadStaff.length > 0) {
      try {
        await base44.asServiceRole.entities.SupportMessage.updateMany(
          { ticket_id: ticket.id, sender_type: "staff", read_by_customer: false },
          { $set: { read_by_customer: true } }
        );
      } catch { /* best-effort */ }
    }

    return Response.json({ ticket, messages, unread: unreadStaff.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}