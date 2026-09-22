import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { displayName, initials } from "@/lib/users";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import AccountNav from "@/components/storefront/account/AccountNav";
import ProfileSection from "@/components/storefront/account/ProfileSection";
import AddressesSection from "@/components/storefront/account/AddressesSection";
import OrdersSection from "@/components/storefront/account/OrdersSection";
import WishlistSection from "@/components/storefront/account/WishlistSection";
import NotificationsSection from "@/components/storefront/account/NotificationsSection";
import SecuritySection from "@/components/storefront/account/SecuritySection";
import LoyaltySection from "@/components/storefront/account/LoyaltySection";
import ReferralSection from "@/components/storefront/account/ReferralSection";
import ReturnsSection from "@/components/storefront/account/ReturnsSection";
import { getLoyaltyConfig } from "@/lib/loyalty";
import BackBar from "@/components/storefront/BackBar";

export default function Account() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "profile";
  const setTab = (t) => setParams({ tab: t }, { replace: true });

  const reload = async () => {
    try { const me = await base44.auth.me(); setUser(me); return me; }
    catch { setUser(null); }
  };

  useEffect(() => {
    (async () => {
      try { setUser(await base44.auth.me()); }
      catch { setUser(null); }
      finally { setLoading(false); }
    })();
    getLoyaltyConfig().then((c) => setLoyaltyEnabled(!!c.enabled)).catch(() => {});
  }, []);

  if (loading) return <div className="pt-24 pb-20 text-center text-sm text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-5 pt-24 pb-20 text-center">
        <h1 className="font-headline text-3xl tracking-tight sm:text-4xl">Sign in to view your account</h1>
        <p className="max-w-sm text-sm text-muted-foreground">Access your profile, addresses, orders, wishlist and preferences.</p>
        <div className="flex gap-2">
          <Button asChild><Link to="/login?returnTo=/account">Sign in</Link></Button>
          <Button asChild variant="outline"><Link to="/register?returnTo=/account">Create account</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 md:pt-24">
      <div className="mx-auto max-w-7xl px-5 pt-5 sm:px-8">
        <BackBar fallbackTo="/" fallbackLabel="Home" />
      </div>
      <div className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-muted">
              {user.avatar_url ? (
                <Image src={user.avatar_url} alt={displayName(user)} fittingType="fill" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
                  {initials(displayName(user)) || "U"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="break-words font-headline text-3xl tracking-tight sm:text-4xl">{displayName(user) || "My account"}</h1>
              <p className="break-words text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[240px_1fr]">
          <AccountNav tab={tab} setTab={setTab} loyaltyEnabled={loyaltyEnabled} />
          <div className="min-w-0">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
              {tab === "profile" && <ProfileSection user={user} reload={reload} />}
              {tab === "addresses" && <AddressesSection />}
              {tab === "orders" && <OrdersSection user={user} />}
              {tab === "wishlist" && <WishlistSection />}
              {tab === "notifications" && <NotificationsSection user={user} reload={reload} />}
              {tab === "security" && <SecuritySection user={user} />}
              {tab === "loyalty" && loyaltyEnabled && <LoyaltySection />}
              {tab === "referrals" && <ReferralSection />}
              {tab === "returns" && <ReturnsSection />}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}