// Admin panel role + per-section permission resolution. Used by the admin
// layout (to gate navigation and routes), the Staff members page, and the
// add-staff dialog. Custom roles (created in the Roles section) are merged in
// by passing a `customRoles` array (Role entity records) to the helpers.

export const ADMIN_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'reports', label: 'Reports' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'orders', label: 'Orders' },
  { id: 'customers', label: 'Customers' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'posters', label: 'Marketing posters' },
  { id: 'home_sections', label: 'Homepage sections' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'abandoned_carts', label: 'Abandoned carts' },
  { id: 'support', label: 'Support' },
  { id: 'faq', label: 'FAQ' },
  { id: 'canned_responses', label: 'Canned responses' },
  { id: 'settings', label: 'Settings' },
];

export const ROLE_DEFAULTS = {
  admin: { dashboard: true, approvals: true, rejected: true, reports: true, products: true, categories: true, orders: true, customers: true, reviews: true, posters: true, coupons: true, home_sections: true, navigation: true, settings: true, abandoned_carts: true, support: true, faq: true, canned_responses: true },
  product_manager: { products: true, categories: true, reports: true, approvals: true, rejected: true },
  delivery_manager: { orders: true, reports: true },
  marketing_manager: { reviews: true, posters: true, coupons: true, home_sections: true, abandoned_carts: true, support: true, faq: true, canned_responses: true },
  user: {},
};

export const ROLE_LABELS = {
  admin: 'Main admin',
  product_manager: 'Product manager',
  delivery_manager: 'Delivery manager',
  marketing_manager: 'Marketing manager',
  user: 'Customer',
};

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Main admin' },
  { value: 'product_manager', label: 'Product manager' },
  { value: 'delivery_manager', label: 'Delivery manager' },
  { value: 'marketing_manager', label: 'Marketing manager' },
  { value: 'user', label: 'Customer' },
];

export const BUILTIN_STAFF_ROLE_OPTIONS = ROLE_OPTIONS.filter((r) => r.value !== 'user');

// True if a value stored on a defaults map means "allowed". Built-in defaults
// use booleans; custom roles store 'allow'/'deny' strings.
export function isDefaultAllowed(value) {
  return value === true || value === 'allow';
}

// Section ids that a defaults map grants access to.
export function defaultsAllowed(defaults = {}) {
  return Object.keys(defaults).filter((k) => isDefaultAllowed(defaults[k]));
}

// Defaults for a role value: a persisted override entity wins over the
// built-in defaults, so admins can edit built-in roles from the Roles page.
export function roleDefaults(roleValue, customRoles = []) {
  const custom = (customRoles || []).find((r) => r.name === roleValue);
  if (custom) return custom.permissions || {};
  if (ROLE_DEFAULTS[roleValue]) return ROLE_DEFAULTS[roleValue];
  return {};
}

export function roleLabel(roleValue, customRoles = []) {
  if (ROLE_LABELS[roleValue]) return ROLE_LABELS[roleValue];
  const custom = (customRoles || []).find((r) => r.name === roleValue);
  return (custom && custom.label) || roleValue || '—';
}

// Built-in staff roles + custom roles (excludes the customer 'user' role).
export function roleOptions(customRoles = []) {
  const built = BUILTIN_STAFF_ROLE_OPTIONS.slice();
  const seen = new Set(built.map((r) => r.value));
  const customs = (customRoles || [])
    .filter((r) => r.name && !seen.has(r.name))
    .map((r) => ({ value: r.name, label: r.label, custom: true }));
  return [...built, ...customs];
}

// Staff & access + Roles pages themselves are reserved for the main admin.
export function canAccess(user, section, customRoles = []) {
  if (!user) return false;
  if (section === 'users' || section === 'roles' || section === 'settings') return user.role === 'admin';
  if (user.role === 'admin') return true;
  const perms = user.permissions || {};
  const explicit = perms[section];
  if (explicit === 'deny') return false;
  if (explicit === 'allow') return true;
  const defaults = roleDefaults(user.role, customRoles);
  return defaultsAllowed(defaults).includes(section);
}

export function accessibleNavSections(user, customRoles = []) {
  const sections = ADMIN_SECTIONS.filter((s) => canAccess(user, s.id, customRoles));
  if (user.role === 'admin') {
    return sections.concat([
      { id: 'roles', label: 'Roles' },
      { id: 'users', label: 'Staff members' },
    ]);
  }
  return sections;
}