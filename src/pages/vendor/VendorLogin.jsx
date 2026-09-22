import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";
import { STAFF_ROLES } from "@/lib/vendorAuth";

export default function VendorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      const me = await base44.auth.me();
      // Vendor login routes exclusively to /vendor/*. A staff/admin account is
      // rejected here (they belong in the admin panel); a plain customer is
      // also rejected (no vendor account).
      if (!me || me.role !== "vendor") {
        await base44.auth.logout();
        if (me && STAFF_ROLES.includes(me.role)) {
          setError("This is a staff account. Staff sign in at the admin portal.");
        } else {
          setError("This account is not a vendor account. Register as a vendor to continue.");
        }
        return;
      }
      window.location.href = "/vendor/dashboard";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
              <Store className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight">Vendor sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">For approved vendor partners.</p>
          </div>

          {error && <div className="mt-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Vendor email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" placeholder="you@business.com" required autoFocus />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-11 h-11" placeholder="••••••••" required />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full font-medium" disabled={loading}>
              {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>) : "Sign in to vendor portal"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Want to sell with us?{" "}
            <Link to="/vendor/register" className="font-medium text-primary hover:underline">Become a vendor</Link>
          </p>

          <Link to="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
        </div>
      </div>
    </div>
  );
}