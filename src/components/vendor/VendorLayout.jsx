import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, UserCog, ArrowLeft, Clock, Ban, XCircle, LogOut } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getMyVendor } from "@/lib/vendorAuth";

const NAV = [
  { id: "dashboard", label: "Dashboard", path: "/vendor/dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", path: "/vendor/products", icon: Package },
  { id: "profile", label: "Profile", path: "/vendor/profile", icon: UserCog },
];

const STATUS_COPY = {
  pending_verification: { icon: Clock, title: "Your application is under review", text: "We're reviewing your vendor application. You'll be notified by email once it's approved. Product management becomes available after approval." },
  suspended: { icon: Ban, title: "Your vendor account is suspended", text: "Please contact the store administrator to restore access." },
  rejected: { icon: XCircle, title: "Your vendor application was not approved", text: "Contact the store administrator if you believe this is an error." },
  inactive: { icon: Ban, title: "Your vendor account is paused", text: "Your account is currently inactive. Please contact the store administrator." },
};

export default function VendorLayout() {
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const v = await getMyVendor();
        setVendor(v);
      } catch {}
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  // Only vendor-role accounts may enter the portal. Staff/admin are redirected
  // to admin; everyone else to the vendor login.
  if (!user) return <Navigate to="/vendor/login" replace />;
  if (user.role !== "vendor") {
    if (["admin", "product_manager", "delivery_manager", "marketing_manager"].includes(user.role)) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/vendor/login" replace />;
  }
  if (!vendor) return <Navigate to="/vendor/login" replace />;

  // Pending / suspended / rejected / inactive → status screen only, NO nav to
  // any vendor functionality.
  if (vendor.status !== "active") {
    return <VendorStatusScreen vendor={vendor} />;
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;
  const mobileLinkClass = ({ isActive }) =>
    `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col overflow-hidden border-r border-border bg-background md:flex">
        <div className="shrink-0 border-b border-border px-5 py-5">
          <Link to="/" className="text-lg font-semibold tracking-tight">Vendor portal</Link>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{vendor.name}</p>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((s) => {
            const Icon = s.icon;
            return (
              <NavLink key={s.path} to={s.path} className={linkClass}>
                <Icon className="h-4 w-4" /> {s.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="shrink-0 space-y-1 border-t border-border p-3">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
          <button onClick={() => base44.auth.logout("/vendor/login")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-5 py-2.5 backdrop-blur md:px-8">
          <nav className="flex gap-1 overflow-x-auto md:hidden">
            {NAV.map((s) => (
              <NavLink key={s.path} to={s.path} className={mobileLinkClass}>{s.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">{vendor.name}</span>
            <button onClick={() => base44.auth.logout("/vendor/login")} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
          </div>
        </header>
        <main className="p-5 md:p-8">
          <Outlet context={{ vendor, setVendor }} />
        </main>
      </div>
    </div>
  );
}

function VendorStatusScreen({ vendor }) {
  const cfg = STATUS_COPY[vendor.status] || STATUS_COPY.pending_verification;
  const Icon = cfg.icon;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold">{cfg.title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{cfg.text}</p>
      {vendor.status === "rejected" && vendor.rejection_reason && (
        <p className="max-w-md rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{vendor.rejection_reason}</p>
      )}
      <div className="mt-2 flex gap-4 text-sm">
        <Link to="/" className="inline-flex items-center gap-1.5 underline"><ArrowLeft className="h-4 w-4" /> Back to store</Link>
        <button onClick={() => base44.auth.logout("/vendor/login")} className="text-muted-foreground underline">Sign out</button>
      </div>
    </div>
  );
}