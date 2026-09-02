// Admin panel role + per-section permission resolution. Used by the admin
// layout (to gate navigation and routes) and the Staff & access page.

export const ADMIN_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'orders', label: 'Orders' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'posters', label: 'Marketing posters' },
];

export const ROLE_DEFAULTS = {
  admin: { dashboard: true, products: true, categories: true, orders: true, reviews: true, posters: true, users: true },
  product_manager: { products: true, categories: true },
  delivery_manager: { orders: true },
  marketing_manager: { reviews: true, posters: true },
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

// The staff & access page itself is reserved for the main admin.
export function canAccess(user, section) {
  if (!user) return false;
  if (section === 'users') return user.role === 'admin';
  if (user.role === 'admin') return true;
  const perms = user.permissions || {};
  const explicit = perms[section];
  if (explicit === 'deny') return false;
  if (explicit === 'allow') return true;
  const defaults = ROLE_DEFAULTS[user.role] || {};
  return !!defaults[section];
}

export function accessibleNavSections(user) {
  return ADMIN_SECTIONS.filter((s) => canAccess(user, s.id)).concat(
    user.role === 'admin' ? [{ id: 'users', label: 'Staff members' }] : []
  );
}