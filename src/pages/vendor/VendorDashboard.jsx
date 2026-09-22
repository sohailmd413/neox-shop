import React, { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Package, Clock, CheckCircle2, FileEdit, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Vendor dashboard overview — product counts by status + quick actions. Only
// reached by approved (active) vendors; the layout already gates
// pending/suspended vendors to a status screen.
export default function VendorDashboard() {
  const { vendor } = useOutletContext();
  const [products, setProducts] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.entities.Product.filter({ vendor_id: vendor.id }, "-updated_date", 500);
        setProducts(list || []);
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

      <div className="flex flex-wrap gap-3">
        <Button asChild><Link to="/vendor/products">Manage products <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        <Button asChild variant="outline"><Link to="/vendor/profile">Edit profile</Link></Button>
      </div>
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