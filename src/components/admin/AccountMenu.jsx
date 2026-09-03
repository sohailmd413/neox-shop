import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { base44 } from "@/api/base44Client";

const ROLE_LABELS = {
  admin: "Admin",
  product_manager: "Product manager",
  delivery_manager: "Delivery manager",
  marketing_manager: "Marketing manager",
  user: "Customer",
};

function initials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  const i = ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  return i || name.slice(0, 2).toUpperCase();
}

// Account menu for the admin top bar: avatar/initials + name, opens a dropdown
// with the email, role badge, a link to Profile, and a Log out action that ends
// the session and returns to the admin login screen.
export default function AccountMenu({ user }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const name = user.full_name || user.email?.split("@")[0] || "Account";
  const roleLabel = ROLE_LABELS[user.role] || user.role || "Staff";

  const handleLogout = async () => {
    setBusy(true);
    try { await base44.auth.logout(); } catch {}
    window.location.href = "/admin/login";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
            {initials(name) || <UserIcon className="h-4 w-4" />}
          </span>
          <span className="hidden max-w-[140px] truncate font-medium text-foreground sm:block">{name}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {roleLabel}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/admin/profile")} className="cursor-pointer">
          <UserIcon className="h-4 w-4" /> Profile / Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} disabled={busy} className="cursor-pointer text-red-600 focus:text-red-600">
          <LogOut className="h-4 w-4" /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}