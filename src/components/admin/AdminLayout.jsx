import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ClipboardList, Star, ArrowLeft, ShieldAlert, Layers, Image as ImageIcon, Users as UsersIcon, ShieldCheck, ChevronDown, BarChart3, Contact, TicketPercent, Settings as SettingsIcon, ClipboardCheck, FileX, Languages,   LayoutList, Compass, Search, ShoppingCart as CartIcon, MessageSquare, HelpCircle, Bookmark, Gift, RotateCcw, Ruler, Building2, AlertTriangle, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { canAccess } from "@/lib/adminPermissions";
import { loadPendingCounts, loadRejectedCounts } from "@/lib/approval";
import { loadSupportUnread } from "@/lib/supportBadge";
import { loadReturnsPending } from "@/lib/returns";
import { loadLowStockCount } from "@/lib/lowStock";
import NotificationsBell from "@/components/admin/NotificationsBell";
import AccountMenu from "@/components/admin/AccountMenu";

// Per-section metadata (label / path / icon). Groups below reference these ids.
const SECTION_META = {
  dashboard: { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  products: { label: "Products", path: "/admin/products", icon: Package },
  categories: { label: "Categories", path: "/admin/categories", icon: Layers },
  size_charts: { label: "Size charts", path: "/admin/size-charts", icon: Ruler },
  vendors: { label: "Vendors", path: "/admin/vendors", icon: Building2 },
  low_stock: { label: "Low stock", path: "/admin/low-stock", icon: AlertTriangle },
  home_sections: { label: "Home sections", path: "/admin/home-sections", icon: LayoutList },
  navigation: { label: "Navigation", path: "/admin/navigation", icon: Compass },
  approvals: { label: "Approvals", path: "/admin/approvals", icon: ClipboardCheck },
  rejected: { label: "Rejected", path: "/admin/rejected", icon: FileX },
  translations: { label: "Translations", path: "/admin/translations", icon: Languages },
  orders: { label: "Orders", path: "/admin/orders", icon: ClipboardList },
  customers: { label: "Customers", path: "/admin/customers", icon: Contact },
  coupons: { label: "Coupons", path: "/admin/coupons", icon: TicketPercent },
  abandoned_carts: { label: "Abandoned carts", path: "/admin/abandoned-carts", icon: CartIcon },
  campaigns: { label: "Campaigns", path: "/admin/campaigns", icon: Mail },
  reviews: { label: "Reviews", path: "/admin/reviews", icon: Star },
  posters: { label: "Posters", path: "/admin/posters", icon: ImageIcon },
  reports: { label: "Reports", path: "/admin/reports", icon: BarChart3 },
  settings: { label: "Settings", path: "/admin/settings", icon: SettingsIcon },
  users: { label: "Members", path: "/admin/users", icon: UsersIcon },
  roles: { label: "Roles", path: "/admin/roles", icon: ShieldCheck },
  support: { label: "Support", path: "/admin/support", icon: MessageSquare },
  faq: { label: "FAQ", path: "/admin/faq", icon: HelpCircle },
  canned_responses: { label: "Canned Responses", path: "/admin/canned-responses", icon: Bookmark },
  referrals: { label: "Referrals", path: "/admin/referrals", icon: Gift },
  returns: { label: "Returns", path: "/admin/returns", icon: RotateCcw },
};

// Logical groups. Dashboard stays standalone; every other item belongs to a
// group, matching the existing Staff members pattern.
const GROUPS = [
  { id: "catalog", label: "Catalog", sections: ["products", "categories", "size_charts", "home_sections", "navigation"] },
  { id: "operations", label: "Operations", sections: ["vendors", "low_stock"] },
  { id: "moderation", label: "Moderation", sections: ["approvals", "rejected", "translations"] },
  { id: "sales", label: "Sales", sections: ["orders", "customers", "coupons", "abandoned_carts", "campaigns", "referrals", "returns"] },
  { id: "content", label: "Content", sections: ["reviews", "posters"] },
  { id: "support", label: "Support", sections: ["support", "faq", "canned_responses"] },
  { id: "insights", label: "Insights", sections: ["reports"] },
  { id: "configuration", label: "Configuration", sections: ["settings"] },
];
const STAFF_GROUP = { id: "staff", label: "Staff members", sections: ["users", "roles"] };

const STORAGE_KEY = "admin_nav_open_v1";

function groupOf(section) {
  for (const g of [...GROUPS, STAFF_GROUP]) if (g.sections.includes(section)) return g.id;
  return null;
}

export default function AdminLayout() {
  const [user, setUser] = useState(null);
  const [customRoles, setCustomRoles] = useState([]);
  const [checking, setChecking] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [supportUnread, setSupportUnread] = useState(0);
  const [returnsPending, setReturnsPending] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [query, setQuery] = useState("");
  const location = useLocation();

  // Collapsed/expanded groups, remembered per admin across reloads.
  const [openGroups, setOpenGroups] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return new Set(); }
  });
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...openGroups]));
  }, [openGroups]);

  useEffect(() => {
    (async () => {
      try {
        const [me, roles] = await Promise.all([base44.auth.me(), base44.entities.Role.list().catch(() => [])]);
        setUser(me);
        setCustomRoles(roles || []);
      } catch {}
      setChecking(false);
    })();
  }, []);

  const currentSection = () => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") return "dashboard";
    return location.pathname.split("/")[2];
  };

  // Auto-expand the group containing the active page on load / navigation so
  // the active item is never hidden behind a collapsed header.
  useEffect(() => {
    const g = groupOf(currentSection());
    if (g) setOpenGroups((prev) => (prev.has(g) ? prev : new Set(prev).add(g)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const refreshCounts = () => {
    loadPendingCounts().then((c) => setPendingCount((c.products || 0) + (c.categories || 0)));
    loadRejectedCounts().then((c) => setRejectedCount((c.products || 0) + (c.categories || 0)));
    loadLowStockCount().then(setLowStockCount);
  };
  useEffect(() => {
    refreshCounts();
    const offP = base44.entities.Product.subscribe(() => refreshCounts());
    const offC = base44.entities.Category.subscribe(() => refreshCounts());
    return () => { offP?.(); offC?.(); };
  }, []);

  useEffect(() => {
    const refresh = () => loadSupportUnread().then(setSupportUnread);
    refresh();
    const off = base44.entities.SupportMessage.subscribe(() => refresh());
    return () => off?.();
  }, []);

  useEffect(() => {
    const refresh = () => loadReturnsPending().then(setReturnsPending);
    refresh();
    const off = base44.entities.ReturnRequest.subscribe(() => refresh());
    return () => off?.();
  }, []);

  useEffect(() => {
    const refresh = async () => {
      try { const me = await base44.auth.me(); if (me) setUser(me); } catch {}
    };
    window.addEventListener("profile-updated", refresh);
    return () => window.removeEventListener("profile-updated", refresh);
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;

  // Build the accessible item lists.
  const canSee = (s) => canAccess(user, s, customRoles);
  const accessibleGroups = GROUPS.map((g) => ({ ...g, items: g.sections.filter(canSee).map((s) => SECTION_META[s]) }))
    .filter((g) => g.items.length > 0);
  const staffItems = STAFF_GROUP.sections.filter(canSee).map((s) => SECTION_META[s]);
  const hasAny = canSee("dashboard") || accessibleGroups.length > 0 || staffItems.length > 0;

  if (!hasAny) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Staff access required</h1>
        <p className="max-w-sm text-sm text-muted-foreground">You don't have access to the admin panel. Contact the store administrator if you believe this is an error.</p>
        <Link to="/admin/login" className="mt-2 inline-flex items-center gap-1.5 text-sm underline">Staff sign in</Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm underline"><ArrowLeft className="h-4 w-4" /> Back to store</Link>
      </div>
    );
  }

  // Landing on dashboard without dashboard access -> redirect to first allowed section.
  if (location.pathname === "/admin" && !canSee("dashboard")) {
    const all = [...accessibleGroups.flatMap((g) => g.items), ...staffItems];
    return <Navigate to={all[0].path} replace />;
  }

  const toggleGroup = (id) => setOpenGroups((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const cs = currentSection();
  const sectionBlocked = !canSee(cs) && cs !== "dashboard";

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;
  const mobileLinkClass = ({ isActive }) =>
    `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`;

  // Quick-search filtering — flat list across all accessible sections.
  const term = query.trim().toLowerCase();
  const flatAll = [
    ...(canSee("dashboard") ? [SECTION_META.dashboard] : []),
    ...accessibleGroups.flatMap((g) => g.items),
    ...staffItems,
  ];
  const filtered = term ? flatAll.filter((s) => s.label.toLowerCase().includes(term)) : null;

  const renderGroup = (g, badge) => {
    const open = openGroups.has(g.id);
    return (
      <div key={g.id} className="pt-1">
        <button type="button" onClick={() => toggleGroup(g.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground/80 hover:bg-muted hover:text-foreground">
          <span className="flex-1 text-left">{g.label}</span>
          {badge != null && <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">{badge}</span>}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5">
            {g.items.map((s) => {
              const Icon = s.icon;
              return (
                <NavLink key={s.path} to={s.path} end={s.end} className={linkClass}>
                  <Icon className="h-4 w-4" /> {s.label}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col overflow-hidden border-r border-border bg-background md:flex">
        <div className="shrink-0 border-b border-border px-5 py-5">
          <Link to="/" className="text-lg font-semibold tracking-tight">Admin</Link>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Dashboard</p>
        </div>

        {/* Scrollable middle: search + nav. The header above and the
            "Back to store" footer below stay fixed; only this region scrolls. */}
        <div className="flex-1 overflow-y-auto">
        {/* Quick search / jump */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pages…" className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-2 text-sm outline-none focus:border-foreground/40" />
          </div>
        </div>

        <nav className="space-y-0.5 p-3">
          {canSee("dashboard") && !term && (
            <NavLink to="/admin" end className={linkClass}>
              <LayoutDashboard className="h-4 w-4" /> {SECTION_META.dashboard.label}
            </NavLink>
          )}

          {filtered ? (
            <div className="space-y-0.5">
              {filtered.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No matching pages.</p>}
              {filtered.map((s) => {
                const Icon = s.icon;
                return (
                  <NavLink key={s.path} to={s.path} end={s.end} className={linkClass}>
                    <Icon className="h-4 w-4" /> {s.label}
                  </NavLink>
                );
              })}
            </div>
          ) : (
            <>
              {accessibleGroups.map((g) => renderGroup(g, g.id === "moderation" && (pendingCount + rejectedCount) > 0 ? pendingCount + rejectedCount : g.id === "support" && supportUnread > 0 ? supportUnread : g.id === "sales" && returnsPending > 0 ? returnsPending : g.id === "operations" && lowStockCount > 0 ? lowStockCount : null))}
              {staffItems.length > 0 && renderGroup({ id: STAFF_GROUP.id, label: STAFF_GROUP.label, items: staffItems })}
            </>
          )}
        </nav>
        </div>

        <div className="shrink-0 border-t border-border p-3">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
        </div>
      </aside>

      <div className="flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-5 py-2.5 shadow-sm backdrop-blur md:px-8">
          <nav className="flex gap-1 overflow-x-auto md:hidden">
            {[...(canSee("dashboard") ? [SECTION_META.dashboard] : []), ...accessibleGroups.flatMap((g) => g.items), ...staffItems].map((s) => (
              <NavLink key={s.path} to={s.path} end={s.end} className={mobileLinkClass}>{s.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <NotificationsBell />
            <AccountMenu user={user} />
          </div>
        </header>
        <main className="p-5 md:p-8">
          {sectionBlocked ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
              <p className="text-lg font-medium">Access denied</p>
              <p className="max-w-sm text-sm text-muted-foreground">You don't have access to this section. Choose an allowed option from the sidebar.</p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}