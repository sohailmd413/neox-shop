import React from "react";
import { User, MapPin, Package, Heart, Bell, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { key: "profile", label: "Profile", icon: User },
  { key: "addresses", label: "Addresses", icon: MapPin },
  { key: "orders", label: "Orders", icon: Package },
  { key: "loyalty", label: "Rewards", icon: Sparkles, loyalty: true },
  { key: "wishlist", label: "Wishlist", icon: Heart },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Shield },
];

export default function AccountNav({ tab, setTab, loyaltyEnabled }) {
  const items = ITEMS.filter((it) => !it.loyalty || loyaltyEnabled);
  return (
    <nav className="lg:sticky lg:top-24">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
        {items.map((it) => {
          const Icon = it.icon;
          const active = tab === it.key;
          return (
            <li key={it.key}>
              <button
                onClick={() => setTab(it.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm transition-colors lg:rounded-xl lg:w-full",
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