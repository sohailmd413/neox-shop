import React from "react";
import { User, MapPin, Package, Heart, Bell, Shield, Sparkles, Gift, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "orders", label: "Orders", icon: Package },
  { key: "returns", label: "Returns", icon: RotateCcw },
  { key: "loyalty", label: "Rewards", icon: Sparkles, loyalty: true },
  { key: "referrals", label: "Referrals", icon: Gift },
  { key: "wishlist", label: "Wishlist", icon: Heart },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Shield },
];

export default function AccountNav({ tab, setTab, loyaltyEnabled }) {
  const items = ITEMS.filter((it) => !it.loyalty || loyaltyEnabled);
  return (
    <nav className="min-w-0 lg:sticky lg:top-24">
      <ul className="flex flex-wrap gap-2 pb-2 lg:flex-col lg:pb-0">
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.key;
          return (
            <li key={it.key}>
              <button
                onClick={() => setTab(it.key)}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm transition-colors lg:rounded-xl lg:w-full",
                  active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}