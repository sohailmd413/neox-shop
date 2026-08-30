import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, Navigate } from "react-router-dom";
import { LayoutDashboard, Package, ClipboardList, Star, ArrowLeft, ShieldAlert, Layers } from "lucide-react";
import { base44 } from "@/api/base44Client";

const NAV = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Products", path: "/admin/products", icon: Package },
  { label: "Categories", path: "/admin/categories", icon: Layers },
  { label: "Orders", path: "/admin/orders", icon: ClipboardList },
  { label: "Reviews", path: "/admin/reviews", icon: Star },
];

export default function AdminLayout() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
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

  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Only admin accounts can access this area. Contact your store administrator if you believe this is an error.
        </p>
        <Link to="/admin/login" className="mt-2 inline-flex items-center gap-1.5 text-sm underline">
          Admin sign in
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm underline">
          <ArrowLeft className="h-4 w-4" /> Back to store
        </Link>
      </div>
    );
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
      isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <div className="flex min-h-screen bg-muted/20">
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-border bg-background md:flex">
        <div className="border-b border-border px-5 py-5">
          <Link to="/" className="text-lg font-semibold tracking-tight">MAISON</Link>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Admin</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} end={item.end} className={linkClass}>
                <Icon className="h-4 w-4" /> {item.label}
              </NavLink>
            );
          })}
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
            {NAV.map((item) => (
              <NavLink key={item.path} to={item.path} end={item.end} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>
          </div>
        </header>
        <main className="p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}