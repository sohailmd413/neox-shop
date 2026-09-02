import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";

export default function AdminLogin() {
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
      if (!me?.role || me.role === "user") {
        await base44.auth.logout();
        setError("This account does not have staff access. Only staff accounts can sign in here.");
        return;
      }
      window.location.href = "/admin";
    } catch (err) {
      setError(err.message || "Invalid staff credentials");
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
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight">Admin staff sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">For admin, product, delivery & marketing managers.</p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Staff email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="admin@marketflow.com"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-11"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="h-11 w-full font-medium" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in to admin"
              )}
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            Sign in with a staff account. The app owner is the main admin by default; other staff are added via invite, then assigned a role and section access in <span className="font-medium text-foreground">Staff members</span>.
          </div>

          <Link
            to="/"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to store
          </Link>
        </div>
      </div>
    </div>
  );
}