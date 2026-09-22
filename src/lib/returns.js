import { base44 } from "@/api/base44Client";
import { getStoreSetting } from "@/lib/settings";

// Client-side return helpers. Refund math is server-side; these are config +
// presentational only.

export const RETURN_STATUS_LABEL = {
  requested: "Requested", approved: "Approved", rejected: "Rejected",
  item_received: "Item received", refunded: "Refunded", closed: "Closed",
};
export const REASON_LABEL = {
  defective: "Defective", wrong_item: "Wrong item", not_as_described: "Not as described",
  changed_mind: "Changed mind", other: "Other",
};
export const REFUND_METHOD_LABEL = {
  original_payment: "Original payment", store_credit: "Store credit", loyalty_points: "Loyalty points",
};

export async function getReturnsConfig() {
  const s = await getStoreSetting();
  return {
    returnWindowDays: Number(s.return_window_days) || 30,
    refundOnApproval: s.refund_on_approval === true,
    returnShippingInstructions: s.return_shipping_instructions || "",
  };
}

// Pending return-request count for the Admin Sales nav badge. Mirrors the
// loadSupportUnread / loadPendingCounts pattern.
export async function loadReturnsPending() {
  try {
    const list = await base44.entities.ReturnRequest.filter({ status: "requested" }, "-created_date", 200);
    return (list || []).length;
  } catch {
    return 0;
  }
}