import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Truck, RotateCcw, ShieldCheck, ShoppingBag } from "lucide-react";
import Navbar from "./Navbar";
import CartDrawer from "./CartDrawer";
import { CartFlyoutProvider } from "@/components/storefront/cart/CartFlyoutContext";
import PageTransition from "@/components/shared/PageTransition";
import PosterBanner from "@/components/storefront/PosterBanner";
import BackNavTracker from "@/components/storefront/BackNavTracker";
import { useLanguage } from "@/lib/i18n";
import { useStoreSetting } from "@/lib/useStoreSetting";
import { Image } from "@/components/ui/image";

const TRUST = [
  { key: "trust.freeDelivery", icon: Truck },
  { key: "trust.returns", icon: RotateCcw },
  { key: "trust.secure", icon: ShieldCheck },
];

export default function StorefrontLayout() {
  const { t, lang } = useLanguage();
  const store = useStoreSetting();
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <CartFlyoutProvider>
      <BackNavTracker />
      <Navbar />
      {/* Desktop-only spacer so content clears the second nav row added in
          the marketplace header; mobile keeps a single-row header. */}
      <div aria-hidden className="hidden h-7 md:block" />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>

      {/* Trust signals strip */}
      <div className="border-y border-border bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 sm:px-8">
          {TRUST.map(({ key, icon: Icon }) => (
            <span key={key} className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Icon className="h-5 w-5 text-primary" />
              {t(key)}
            </span>
          ))}
        </div>
      </div>

      <footer className="bg-brand-navy text-slate-300">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          {/* Footer banner slot (live Poster; renders nothing when absent) */}
          <PosterBanner page="home" zone="footer" className="mb-10 aspect-[8/1] overflow-hidden rounded-2xl" />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link to="/" className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-white" />
                <span className="text-xl font-extrabold tracking-tight text-white">
                  NeoX<span className="text-slate-400">.shop</span>
                </span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-slate-400">
                {t("footer.tagline")}
              </p>
              <div className="mt-3 space-y-1 text-xs text-slate-400">
                {store.contact_email && (
                  <p><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{store.contact_email}</span></p>
                )}
                {store.contact_phone && (
                  <p><span dir="ltr" style={{ unicodeBidi: "isolate" }}>{store.contact_phone}</span></p>
                )}
                {(() => {
                  const addr = lang === "ar" && store.business_address_ar ? store.business_address_ar : store.business_address;
                  if (!addr) return null;
                  const isolate = !(lang === "ar" && store.business_address_ar);
                  return <p>{isolate ? <span dir="ltr" style={{ unicodeBidi: "isolate" }}>{addr}</span> : addr}</p>;
                })()}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-slate-200">
                {t("footer.shop")}
              </h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/shop" className="text-slate-300 hover:text-white hover:underline">{t("footer.allProducts")}</Link></li>
                <li><Link to="/shop?sort=newest" className="text-slate-300 hover:text-white hover:underline">{t("footer.newArrivals")}</Link></li>
                <li><Link to="/shop?filter=sale" className="text-slate-300 hover:text-white hover:underline">{t("footer.sale")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-slate-200">
                {t("footer.support")}
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>{t("footer.shipping")}</li>
                <li>{t("footer.contact")}</li>
                <li>{t("footer.faq")}</li>
                <li className="pt-1"><Link to="/policies/terms" className="hover:text-white hover:underline">Terms of Service</Link></li>
                <li><Link to="/policies/privacy" className="hover:text-white hover:underline">Privacy Policy</Link></li>
                <li><Link to="/policies/return" className="hover:text-white hover:underline">Return Policy</Link></li>
                <li><Link to="/policies/shipping" className="hover:text-white hover:underline">Shipping Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-slate-200">
                {t("footer.newsletter")}
              </h4>
              <p className="mt-3 text-sm text-slate-400">
                {t("footer.newsletterText")}
              </p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  placeholder={t("footer.emailPlaceholder")}
                  className="h-9 flex-1 rounded-full border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-white/40"
                />
                <button className="rounded-full bg-brand-gradient px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                  {t("footer.join")}
                </button>
              </form>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 sm:flex-row">
            <p>{t("footer.rights")}</p>
            <p>{t("footer.crafted")}</p>
          </div>
        </div>
      </footer>
      <CartDrawer />
      </CartFlyoutProvider>
    </div>
  );
}