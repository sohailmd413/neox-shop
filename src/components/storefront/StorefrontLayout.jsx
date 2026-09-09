import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Navbar from "./Navbar";
import CartDrawer from "./CartDrawer";
import { CartFlyoutProvider } from "@/components/storefront/cart/CartFlyoutContext";
import PageTransition from "@/components/shared/PageTransition";
import BackNavTracker from "@/components/storefront/BackNavTracker";
import { useLanguage } from "@/lib/i18n";
import { useStoreSetting } from "@/lib/useStoreSetting";

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

      <footer className="relative bg-brand-navy text-slate-300">
        {/* Brand-blue accent line across the top */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-ring/50 to-transparent" />
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Brand + contact */}
            <div className="lg:col-span-5">
              <Link to="/" className="flex items-center gap-2.5">
                {store.logo_url ? (
                  <img src={store.logo_url} alt={store.store_name || "NeoX Shop"} className="h-9 w-auto max-w-[170px] object-contain brightness-0 invert" />
                ) : (
                  <>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-ring/20">
                      <ShoppingBag className="h-5 w-5 text-white" />
                    </span>
                    <span className="text-2xl font-extrabold tracking-tight text-white">
                      NeoX<span className="text-slate-400">.shop</span>
                    </span>
                  </>
                )}
              </Link>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-400">
                {t("footer.tagline")}
              </p>
              <div className="mt-6 space-y-2 text-sm text-slate-400">
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
                  return <p className="max-w-xs">{isolate ? <span dir="ltr" style={{ unicodeBidi: "isolate" }}>{addr}</span> : addr}</p>;
                })()}
              </div>
            </div>
            {/* Shop + Support */}
            <div className="grid grid-cols-2 gap-8 lg:col-span-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  {t("footer.shop")}
                </h4>
                <ul className="mt-4 space-y-3 text-sm">
                  <li><Link to="/shop" className="text-slate-400 transition-colors hover:text-white">{t("footer.allProducts")}</Link></li>
                  <li><Link to="/shop?sort=newest" className="text-slate-400 transition-colors hover:text-white">{t("footer.newArrivals")}</Link></li>
                  <li><Link to="/shop?filter=sale" className="text-slate-400 transition-colors hover:text-white">{t("footer.sale")}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  {t("footer.support")}
                </h4>
                <ul className="mt-4 space-y-3 text-sm text-slate-400">
                  <li>{t("footer.shipping")}</li>
                  <li>{t("footer.contact")}</li>
                  <li>{t("footer.faq")}</li>
                  <li className="pt-1"><Link to="/policies/terms" className="transition-colors hover:text-white">Terms of Service</Link></li>
                  <li><Link to="/policies/privacy" className="transition-colors hover:text-white">Privacy Policy</Link></li>
                  <li><Link to="/policies/return" className="transition-colors hover:text-white">Return Policy</Link></li>
                  <li><Link to="/policies/shipping" className="transition-colors hover:text-white">Shipping Policy</Link></li>
                </ul>
              </div>
            </div>
            {/* Newsletter */}
            <div className="lg:col-span-3">
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-white">
                {t("footer.newsletter")}
              </h4>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                {t("footer.newsletterText")}
              </p>
              <form className="mt-5 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1.5 pl-4 transition-colors focus-within:border-ring" onSubmit={(e) => e.preventDefault()}>
                <input
                  placeholder={t("footer.emailPlaceholder")}
                  className="h-9 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                />
                <button className="shrink-0 rounded-full bg-brand-gradient px-5 h-9 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
                  {t("footer.join")}
                </button>
              </form>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
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