import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./Navbar";
import CartDrawer from "./CartDrawer";
import PageTransition from "@/components/shared/PageTransition";
import { useLanguage } from "@/lib/i18n";
import { useStoreSetting } from "@/lib/useStoreSetting";
import { Image } from "@/components/ui/image";

export default function StorefrontLayout() {
  const { t } = useLanguage();
  const store = useStoreSetting();
  const location = useLocation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link to="/" className="flex items-center gap-2">
                {store.logo_url ? (
                  <Image src={store.logo_url} alt={store.store_name || "Store"} fittingType="fit" className="h-8 w-auto max-w-[140px]" />
                ) : (
                  <span className="text-lg font-semibold tracking-tight">{store.store_name || "MarketFlow"}</span>
                )}
              </Link>
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                {t("footer.tagline")}
              </p>
              <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                {store.contact_email && <p>{store.contact_email}</p>}
                {store.contact_phone && <p>{store.contact_phone}</p>}
                {store.business_address && <p>{store.business_address}</p>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("footer.shop")}
              </h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/shop" className="hover:underline">{t("footer.allProducts")}</Link></li>
                <li><Link to="/shop?sort=newest" className="hover:underline">{t("footer.newArrivals")}</Link></li>
                <li><Link to="/shop?filter=sale" className="hover:underline">{t("footer.sale")}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("footer.support")}
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>{t("footer.shipping")}</li>
                <li>{t("footer.contact")}</li>
                <li>{t("footer.faq")}</li>
                <li className="pt-1"><Link to="/policies/terms" className="hover:text-foreground hover:underline">Terms of Service</Link></li>
                <li><Link to="/policies/privacy" className="hover:text-foreground hover:underline">Privacy Policy</Link></li>
                <li><Link to="/policies/return" className="hover:text-foreground hover:underline">Return Policy</Link></li>
                <li><Link to="/policies/shipping" className="hover:text-foreground hover:underline">Shipping Policy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {t("footer.newsletter")}
              </h4>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("footer.newsletterText")}
              </p>
              <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  placeholder={t("footer.emailPlaceholder")}
                  className="h-9 flex-1 rounded-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
                />
                <button className="rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90">
                  {t("footer.join")}
                </button>
              </form>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>{t("footer.rights")}</p>
            <p>{t("footer.crafted")}</p>
          </div>
        </div>
      </footer>
      <CartDrawer />
    </div>
  );
}