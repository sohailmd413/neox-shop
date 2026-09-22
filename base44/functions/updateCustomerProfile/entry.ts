import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Central, server-enforced path for a customer updating their own profile.
// Email is owned by the platform auth and cannot be changed here (it is
// verified at sign-up via OTP), so only phone is uniqueness-checked. Phone
// uniqueness is enforced server-side against all users before writing, so a
// client can't bypass it by hitting the SDK directly.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }

    const {
      check_only,
      phone,
      display_name,
      date_of_birth,
      gender,
      avatar_url,
      language,
      marketing_opt_in,
      customer_notifications,
      push_preferences,
    } = body || {};

    // Phone uniqueness (customer-wide).
    if (phone !== undefined) {
      const normalized = String(phone || "").trim();
      if (normalized) {
        const all = await base44.asServiceRole.entities.User.list();
        const clash = (all || []).some(
          (u) => u.id !== user.id && String(u.phone || "").trim() === normalized
        );
        if (clash) {
          return Response.json({
            available: false,
            conflict: "phone",
            message: "This phone number is already registered. Try logging in instead.",
          });
        }
      }
    }

    if (check_only) {
      return Response.json({ available: true });
    }

    const patch = {};
    if (display_name !== undefined) patch.display_name = String(display_name || "").trim();
    if (phone !== undefined) patch.phone = String(phone || "").trim();
    if (date_of_birth !== undefined) patch.date_of_birth = date_of_birth || "";
    if (gender !== undefined) patch.gender = gender || "";
    if (avatar_url !== undefined) patch.avatar_url = avatar_url || "";
    if (language !== undefined) patch.language = language || "en";
    if (marketing_opt_in !== undefined) patch.marketing_opt_in = !!marketing_opt_in;
    if (customer_notifications !== undefined) patch.customer_notifications = customer_notifications;
    if (push_preferences !== undefined) patch.push_preferences = push_preferences;

    const updated = await base44.asServiceRole.entities.User.update(user.id, patch);
    return Response.json({ available: true, user: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}