// Single source of truth for resolving a staff member's display name across
// the admin header, audit trail, notifications, and the staff list. Prefers
// the editable display_name field, then falls back to the platform-managed
// full_name, then email. Keep all name display going through displayName() so
// an update in one place propagates everywhere.

export function displayName(user) {
  if (!user) return "";
  const dn = user.display_name && String(user.display_name).trim();
  return dn || user.full_name || user.email || "";
}

// First letters of the first two words; used for the avatar fallback circle.
export function initials(name) {
  if (!name) return "";
  const parts = String(name).trim().split(/\s+/);
  const i = ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  return i || String(name).slice(0, 2).toUpperCase();
}

// Validation for the Full name field on Profile and the staff edit form.
export function validateDisplayName(value) {
  const s = (value || "").trim();
  if (!s) return "Full name is required";
  if (s.length < 2) return "Name must be at least 2 characters";
  if (s.length > 50) return "Name must be 50 characters or fewer";
  if (/^\d+$/.test(s)) return "Name can't be purely numeric";
  return "";
}