import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Package, Clock, CheckCircle2, FileEdit, ArrowRight, AlertCircle, Bell, Circle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_LABEL = { active: "Live", inactive: "Inactive", draft: "Draft", pending_approval: "In review", rejected: "Rejected", archived: "Archived" };
const STATUS_BADGE = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  pending_approval: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  draft: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  archived: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  inactive: "bg-muted text-muted-foreground",
};

// Vendor dashboard overview — product counts by status, a getting-started
// checklist for new vendors, recent activity, and quick actions. Only reached
// by approved (active) vendors; the layout gates pending/suspended vendors to a
// status screen.
export default function VendorDashboard() {
  const { vendor } = useOutletContext();
  const [products, setProducts] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [list, notifs] = await Promise.all([
          base44.entities.Product.filter({ vendor_id: vendor.id }, "-updated_date", 500),
          base44.entities.Notification.filter({}, "-created_date", 6).catch(() => []),
        ]);
        setProducts(list || []);
        setNotifications(notifs || []);
      } catch {
        setProducts([]);
      }
    })();
  }, [vendor?.id]);

  const counts = {
    total: products?.length || 0,
    draft: products?.filter((p) => p.status === "draft").length || 0,
    pending: products?.filter((p) => p.status === "pending_approval").length || 0,
    active: products?.filter((p) => p.status === "active").length || 0,
    rejected: products?.filter((p) => p.status === "rejected").length || 0,
  };

  const profileComplete = !!(vendor.logo_url && vendor.store_description_en && vendor.contact_name);
  const hasProduct = counts.total > 0;
  const hasSubmitted = (products || []).some((p) => ["pending_approval", "active", "rejected"].includes(p.status));
  const hasLive = counts.active > 0;

  const steps = [
    { done: profileComplete, label: "Complete your profile", hint: "Add a logo and store description.", to: "/vendor/profile" },
    { done: hasProduct, label: "Add your first product", hint: "Create a product and save it as a draft.", to: "/vendor/products" },
    { done: hasSubmitted, label: "Submit a product for approval", hint: "Send a product to the admin for review.", to: "/vendor/products" },
    { done: hasLive, label: "Get your first product live", hint: "Once approved, your product appears on the store.", to: "/vendor/products" },
  ];
  const allDone = steps.every((s) => s.done);

  const recent = (products || [])
    .slice()
    .sort((a, b) => new Date(b.last_edited_at || b.updated_date || 0) - new Date(a.last_edited_at || a.updated_date || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {vendor.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your products and profile.</p>
      </div>

      {counts.rejected > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">{counts.rejected} product{counts.rejected > 1 ? "s need" : " needs"} attention</p>
            <p className="text-xs text-muted-foreground">Some products were rejected. Open Products to review the reason, fix them, and resubmit.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Package} label="Total products" value={counts.total} />
        <StatCard icon={Clock} label="Awaiting review" value={counts.pending} />
        <StatCard icon={CheckCircle2} label="Live" value={counts.active} />
        <StatCard icon={FileEdit} label="Drafts" value={counts.draft} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Getting started checklist */}
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-amber-500" /> Getting started</div>
          {allDone ? (
            <p className="mt-3 text-sm text-muted-foreground">You're all set — your store is live and selling. Keep adding products to grow.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  {s.done ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${s.done ? "text-muted-foreground line-through" : "font-medium"}`}>{s.label}</p>
                    {!s.done && <p className="text-xs text-muted-foreground">{s.hint}</p>}
                  </div>
                  {!s.done && s.to && (
                    <Link to={s.to} className="shrink-0 text-xs font-medium text-primary hover:underline">Go</Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent activity on the vendor's products */}
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center gap-2 text-sm font-medium"><Clock className="h-4 w-4 text-muted-foreground" /> Recent activity</div>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No activity yet. Once you add or submit products, status changes appear here.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.images?.[0] ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name || "Untitled product"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.last_edited_at ? new Date(p.last_edited_at).toLocaleDateString() : "—"}
                      {p.rejection_reason ? ` · ${p.rejection_reason}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[p.status] || "bg-muted text-muted-foreground"}`}>{STATUS_LABEL[p.status]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild><Link to="/vendor/products">Manage products <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        <Button asChild variant="outline"><Link to="/vendor/profile">Edit profile</Link></Button>
      </div>

      {notifications.length > 0 && (
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center gap-2 text-sm font-medium"><Bell className="h-4 w-4 text-muted-foreground" /> Recent updates</div>
          <ul className="mt-3 space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="flex items-start gap-2 text-sm">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.type === "rejected" ? "bg-destructive" : n.type === "approved" ? "bg-emerald-500" : "bg-foreground"}`} />
                <span className={n.read ? "text-muted-foreground" : "text-foreground"}>{n.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}