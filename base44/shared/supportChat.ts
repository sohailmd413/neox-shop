// Shared helpers for the customer-facing support chat backend functions.
// Lives here (not duplicated) so start/send/get all normalize identically.

export function normEmail(e: string): string {
  return String(e || "").trim().toLowerCase();
}

// Resolve the acting customer from the request: a logged-in user wins, but a
// guest body payload (customer_id/email) is also accepted so unauthenticated
// visitors can start and continue a conversation.
export async function resolveCustomer(base44: any, body: any) {
  let user: any = null;
  try { user = await base44.auth.me(); } catch { /* not logged in */ }
  const customerId = body.customer_id || user?.id || null;
  const email = normEmail(body.email || (user?.email ? String(user.email) : ""));
  const name = String(body.name || user?.full_name || user?.display_name || "").trim();
  return { user, customerId, email, name };
}

// A ticket "belongs" to a caller when either their user id or their guest
// email matches the stored customer. Guards against one customer reading or
// posting into another's ticket.
export function ownsTicket(ticket: any, customerId: string | null, email: string) {
  if (!ticket) return false;
  if (customerId && ticket.customer_id === customerId) return true;
  if (email && ticket.customer_email === email) return true;
  return false;
}