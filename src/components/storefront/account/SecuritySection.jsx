import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { KeyRound, LogOut } from "lucide-react";

export default function SecuritySection({ user }) {
  const signOut = async () => {
    await base44.auth.logout();
    window.location.href = "/";
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Security</h2>
        <p className="text-sm text-muted-foreground">Manage your password and sign-in.</p>
      </div>
      <div className="rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><KeyRound className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Change it via the secure email reset flow.</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm"><Link to="/forgot-password">Reset password</Link></Button>
        </div>
      </div>
      <div className="rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">End your current session on this device.</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}><LogOut className="mr-1.5 h-4 w-4" /> Sign out</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Signed in as {user.email}.</p>
    </div>
  );
}