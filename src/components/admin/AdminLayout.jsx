import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ClipboardList, Star, ArrowLeft, ShieldAlert, Layers, Image as ImageIcon, Users as UsersIcon, ShieldCheck, ChevronDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { canAccess } from "@/lib/adminPermissions";

const NAV = [
  { section: "dashboard", label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { section: "products", label: "Products", path: "/admin/products", icon: Package },
  { section: "categories", label: "Categories", path: "/admin/categories", icon: Layers },
  { section: "orders", label: "Orders", path: "/admin/orders", icon: ClipboardList },
  { section: "reviews", label: "Reviews", path: "/admin/reviews", icon: Star },
  { section: "posters", label: "Posters", path: "/admin/posters", icon: ImageIcon },
];

// Staff members groups the Members and Roles sub-pages; both are admin-only.
const STAFF_GROUP = {
  section: "staff",
  label: "Staff members",
  icon: UsersIcon,
  children: [
    { section: "users", label: "Members", path: "/admin/users", icon: UsersIcon },
    { section: "roles", label: "Roles", path: "/admin/roles", icon: ShieldCheck },
  ],
};

export default function AdminLayout() {
  const [user, setUser] = useState(null);
  const [customRoles, setCustomRoles] = useState([]);
  const [checking, setChecking] = useState(true);
  const [staffOpen, setStaffOpen] = useState(true);
  const location = useLocation();

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

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = NAV.filter((n) => canAccess(user, n.section, customRoles));
  const staffChildren = STAFF_GROUP.children.filter((c) => canAccess(user, c.section, customRoles));
  const hasStaff = staffChildren.length > 0;

  // Customer accounts (or unknown roles) have no admin access at all.
  if (navItems.length === 0 && !hasStaff) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Staff access required</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don't have access to the admin panel. Contact the store administrator if you believe this is an error.
        </p>
        <Link to="/admin/login" className="mt-2 inline-flex items-center gap-1.5 text-sm underline">
          Staff sign in
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm underline">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>
      </div>
    );
  }

  // Map the current route to a section and guard direct URL access.
  const sectionFromPath = () => {
    if (location.pathname === "/admin" || location.pathname === "/admin/") return "dashboard";
    return location.pathname.split("/")[2];
  };
  const currentSection = sectionFromPath();

  // Landing on dashboard without dashboard access -> redirect to first allowed section.
  if (location.pathname === "/admin" && !canAccess(user, "dashboard", customRoles)) {
    const first = [...navItems, ...staffChildren][0];
    return <Navigate to={first.path} replace />;
  }

  const sectionBlocked = !canAccess(user, currentSection, customRoles);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
      isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;
  const mobileLinkClass = ({ isActive }) =>
    `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-border bg-background md:flex">
        <div className="border-b border-border px-5 py-5">
          <Link to="/" className="text-lg font-semibold tracking-tight">Admin</Link>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Dashboard</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} end={item.end} className={linkClass}>
                <Icon className="h-4 w-4" /> {item.label}
              </NavLink>
            );
          })}
          {hasStaff && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setStaffOpen((v) => !v)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <UsersIcon className="h-4 w-4" />
                <span className="flex-1 text-left">Staff members</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${staffOpen ? "rotate-180" : ""}`} />
              </button>
              {staffOpen && (
                <div className="mt-1 ml-5 space-y-0.5 border-l border-border pl-2">
                  {staffChildren.map((child) => {
                    const Icon = child.icon;
                    return (
                      <NavLink key={child.path} to={child.path} className={linkClass}>
                        <Icon className="h-4 w-4" /> {child.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
        <div className="border-t border-border p-3">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border bg-background px-5 py-3 md:px-8">
          <nav className="flex gap-1 overflow-x-auto md:hidden">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.end} className={mobileLinkClass}>
                {item.label}
              </NavLink>
            ))}
            {staffChildren.map((child) => (
              <NavLink key={child.path} to={child.path} className={mobileLinkClass}>
                {child.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </div>
        </header>
        <main className="p-5 md:p-8">
          {sectionBlocked ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
              <p className="text-lg font-medium">Access denied</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                You don't have access to this section. Choose an allowed option from the sidebar.
              </p>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}