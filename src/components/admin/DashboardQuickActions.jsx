import React from "react";
import { Link } from "react-router-dom";
import { PackagePlus, Tag, ClipboardList, Layers, Download } from "lucide-react";

export default function DashboardQuickActions() {
  const actions = [
    { label: "Add product", to: "/admin/products", icon: PackagePlus },
    { label: "Add category", to: "/admin/categories", icon: Layers },
    { label: "View orders", to: "/admin/orders", icon: ClipboardList },
    { label: "Create coupon", to: "/admin/products", icon: Tag },
  ];
  return (
    <div className="rounded-2xl border border-border bg-background p-6">
      <h2 className="text-base font-medium">Quick actions</h2>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.label} to={a.to}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" /> {a.label}
            </Link>
          );
        })}
      </div>
      <Link to="/admin/orders"
        className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-foreground px-3 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90">
        <Download className="h-4 w-4" /> Export reports
      </Link>
    </div>
  );
}