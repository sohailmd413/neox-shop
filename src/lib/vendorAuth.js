import { base44 } from "@/api/base44Client";

// Fetch the Vendor record belonging to the logged-in user (scoped by user_id
// via RLS — a vendor can only read their own record). Returns null if the
// user is not logged in or has no vendor record.
export async function getMyVendor() {
  const me = await base44.auth.me().catch(() => null);
  if (!me) return null;
  const list = await base44.entities.Vendor.filter({ user_id: me.id }).catch(() => []);
  return (list && list[0]) || null;
}

// Staff role whitelist — vendors are deliberately excluded. Used to gate the
// admin login and the admin layout from vendor accounts.
export const STAFF_ROLES = ["admin", "product_manager", "delivery_manager", "marketing_manager"];

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}